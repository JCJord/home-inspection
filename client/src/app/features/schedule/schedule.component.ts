import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionsService } from '../../core/services/inspections.service';
import { Inspection } from '../../core/models/inspection.interface';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { TextInputComponent } from '../../shared/components/inputs/text-input/text-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';
import { DropdownMenuComponent, DropdownItem } from '../../shared/components/dropdown-menu/dropdown-menu.component';
import {
  LucideAngularModule,
  Calendar,
  Plus,
  MapPin,
  User,
  Clock,
  DollarSign,
  X,
  AlertCircle,
  Phone,
  Mail,
  Edit2,
  Trash2,
  MoreVertical,
} from 'lucide-angular';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    TextInputComponent,
    LucideAngularModule,
    SkeletonComponent,
    BackButtonComponent,
    DropdownMenuComponent,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  providers: [
    {
      provide: 'lucideIcons',
      useValue: {
        Calendar,
        Plus,
        MapPin,
        User,
        Clock,
        DollarSign,
        X,
        AlertCircle,
        Phone,
        Mail,
        Edit2,
        Trash2,
        MoreVertical,
      },
    },
  ],
})
export class ScheduleComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);

  scheduledJobs = signal<Inspection[]>([]);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  showBookingForm = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingJob = signal<Inspection | null>(null);
  errorMessage = signal<string | null>(null);

  readonly icons = {
    Calendar,
    Plus,
    MapPin,
    User,
    Clock,
    DollarSign,
    X,
    AlertCircle,
    Phone,
    Mail,
    Edit2,
    Trash2,
    MoreVertical,
  };

  bookingForm: FormGroup = this.fb.group({
    client_name: ['', [Validators.required, Validators.maxLength(100)]],
    client_email: ['', [Validators.email]],
    client_phone: [''],
    address: ['', [Validators.maxLength(300)]],
    agreed_price: [null],
    scheduled_date: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadScheduledJobs();
  }

  loadScheduledJobs(): void {
    this.isLoading.set(true);
    this.inspectionsService.getInspections(1, 50, true, 'scheduled').subscribe({
      next: (res) => {
        const sorted = [...res.data].sort((a, b) => {
          const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
          const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
          return dateA - dateB;
        });
        this.scheduledJobs.set(sorted);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  getMenuItems(job: Inspection): DropdownItem[] {
    return [
      {
        label: 'Open Inspection',
        icon: this.icons.Clock,
        action: () => this.openInspection(job),
      },
      {
        label: 'Edit Schedule',
        icon: this.icons.Edit2,
        action: () => this.toggleBookingForm(job),
      },
      {
        label: 'Delete',
        icon: this.icons.Trash2,
        danger: true,
        action: () => this.deleteJob(job),
      },
    ];
  }

  openInspection(job: Inspection): void {
    this.router.navigate(['/inspections', job.id]);
  }

  toggleBookingForm(job?: Inspection): void {
    if (job) {
      this.isEditMode.set(true);
      this.editingJob.set(job);
      this.showBookingForm.set(true);

      // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
      let formattedDate = '';
      if (job.scheduled_date) {
        const date = new Date(job.scheduled_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
      }

      this.bookingForm.patchValue({
        client_name: job.client_name,
        client_email: job.client_email,
        client_phone: job.client_phone,
        address: job.address,
        agreed_price: job.agreed_price,
        scheduled_date: formattedDate,
      });
    } else {
      this.isEditMode.set(false);
      this.editingJob.set(null);
      this.showBookingForm.update((v) => !v);
      if (!this.showBookingForm()) {
        this.bookingForm.reset();
        this.errorMessage.set(null);
      }
    }
  }

  onSubmitBooking(): void {
    if (this.bookingForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.errorMessage.set(null);

      const formValue = { ...this.bookingForm.value };

      // Clean up empty strings
      if (!formValue.client_email) delete formValue.client_email;
      if (!formValue.client_phone) delete formValue.client_phone;
      if (!formValue.address) delete formValue.address;
      if (formValue.agreed_price !== null && formValue.agreed_price !== undefined && formValue.agreed_price !== '') {
        formValue.agreed_price = Number(formValue.agreed_price);
      } else {
        delete formValue.agreed_price;
      }

      // Convert datetime-local to ISO string
      if (formValue.scheduled_date) {
        formValue.scheduled_date = new Date(formValue.scheduled_date).toISOString();
      }

      const request$ = this.isEditMode()
        ? this.inspectionsService.updateInspection(this.editingJob()!.id, formValue)
        : this.inspectionsService.createInspection(formValue);

      request$.subscribe({
        next: (res) => {
          if (this.isEditMode()) {
            this.scheduledJobs.update((jobs) =>
              jobs
                .map((j) => (j.id === res.id ? res : j))
                .sort((a, b) => {
                  const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
                  const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
                  return dateA - dateB;
                })
            );
          } else {
            this.scheduledJobs.update((jobs) =>
              [res, ...jobs].sort((a, b) => {
                const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
                const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
                return dateA - dateB;
              })
            );
          }
          this.isSubmitting.set(false);
          this.showBookingForm.set(false);
          this.bookingForm.reset();
        },
        error: (err) => {
          console.error('Failed to book/update job', err);
          this.errorMessage.set(err.error?.message || 'Failed to process request. Please try again.');
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.bookingForm.markAllAsTouched();
    }
  }

  deleteJob(job: Inspection): void {
    if (confirm('Are you sure you want to delete this scheduled job?')) {
      this.inspectionsService.deleteInspection(job.id).subscribe({
        next: () => {
          this.scheduledJobs.update((jobs) => jobs.filter((j) => j.id !== job.id));
        },
        error: (err) => {
          console.error('Failed to delete job', err);
          alert('Failed to delete job. Please try again.');
        },
      });
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return 'No date set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  formatPrice(price?: number): string {
    if (price === null || price === undefined) return '';
    return `$${Number(price).toFixed(2)}`;
  }

  isToday(dateStr?: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  isPast(dateStr?: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }
}

