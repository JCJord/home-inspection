import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { InspectionsService } from '../../core/services/inspections.service';
import { InspectorsService } from '../../core/services/inspectors.service';
import { Inspection } from '../../core/models/inspection.interface';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { TextInputComponent } from '../../shared/components/inputs/text-input/text-input.component';
import { SearchInputComponent } from '../../shared/components/inputs/search-input/search-input.component';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';
import { ScheduledJobCardComponent } from './components/scheduled-job-card/scheduled-job-card.component';
import {
  Calendar,
  Clock,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  MapPin,
  DollarSign,
  AlertCircle,
  Phone,
  Mail,
  User,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Ban,
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { TemplatesService } from '../templates/services/templates.service';
import { ToggleSwitchComponent } from '../../shared/components/inputs/toggle-switch/toggle-switch.component';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LucideAngularModule,
    ButtonComponent,
    TextInputComponent,
    SearchInputComponent,
    BackButtonComponent,
    ScheduledJobCardComponent,
    ToggleSwitchComponent,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  providers: [
    {
      provide: 'lucideIcons',
      useValue: {
        Calendar,
        Plus,
        Edit2,
        Trash2,
        MoreVertical,
        ChevronDown,
        Search,
        ChevronRight,
        MapPin,
        User,
        Clock,
        DollarSign,
        X,
        AlertCircle,
        Phone,
        Mail,
        Ban,
      },
    },
  ],
})
export class ScheduleComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);
  private inspectorsService = inject(InspectorsService);
  private templatesService = inject(TemplatesService);
  private router = inject(Router);

  scheduledJobs = signal<Inspection[]>([]);
  templates = this.templatesService.templates;
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Modal/Form states
  showBookingForm = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingJob = signal<Inspection | null>(null);

  // Confirmation states
  confirmingJobId = signal<string | null>(null);
  confirmationType = signal<'delete' | 'cancel' | null>(null);

  readonly icons = {
    Calendar,
    Plus,
    Clock,
    MapPin,
    User,
    DollarSign,
    X,
    AlertCircle,
    Phone,
    Mail,
    Edit2,
    Trash2,
    MoreVertical,
    ChevronDown,
    Search,
    ChevronRight,
    Ban,
  };

  searchQuery = signal<string>('');
  public searchControl = new FormControl<string>('', { nonNullable: true });
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);
  totalCount = signal<number>(0);

  hasMore = computed(() => this.scheduledJobs().length < this.totalCount());

  filteredJobs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.scheduledJobs();

    return this.scheduledJobs().filter(job =>
      job.client_name?.toLowerCase().includes(query) ||
      job.address?.toLowerCase().includes(query)
    );
  });

  isSearching = computed(() => this.searchQuery().length > 0);

  todayJobs = computed(() =>
    this.filteredJobs().filter(job => this.isToday(job.scheduled_date))
  );

  upcomingJobs = computed(() =>
    this.filteredJobs().filter(job => !this.isToday(job.scheduled_date) && !this.isPast(job.scheduled_date))
  );

  pastJobs = computed(() =>
    this.filteredJobs().filter(job => this.isPast(job.scheduled_date) && !this.isToday(job.scheduled_date))
  );

  bookingForm: FormGroup = this.fb.group({
    client_name: ['', [Validators.required, Validators.maxLength(100)]],
    client_email: ['', [Validators.email]],
    client_phone: [''],
    address: ['', [Validators.required]],
    scheduled_date: ['', [Validators.required]],
    agreed_price: [null, [Validators.min(0), Validators.max(99999999.99)]],
    template_id: [''],
    send_email: [true],
  });

  ngOnInit(): void {
    this.loadScheduledJobs();
    this.loadInspectorDefaults();
    this.loadTemplates();
    this.setupSearch();
  }

  loadTemplates(): void {
    this.templatesService.getTemplates().subscribe();
  }

  setupSearch(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchQuery.set(value);
      this.currentPage.set(1); // Reset to page 1 on search
    });
  }

  loadInspectorDefaults(): void {
    this.inspectorsService.getProfile().subscribe({
      next: (profile) => {
        if ((profile as any).preferred_template_id) {
          this.bookingForm.patchValue({
            template_id: (profile as any).preferred_template_id
          });
        }
      },
    });
  }

  loadScheduledJobs(append: boolean = false): void {
    if (!append) {
      this.currentPage.set(1);
    }
    
    this.isLoading.set(!append);
    const page = !append ? 1 : this.currentPage();
    const limit = this.pageSize();
    const search = undefined;

    this.inspectionsService.getInspections(page, limit, true, 'scheduled', search).subscribe({
      next: (res) => {
        this.totalCount.set(res.meta.total);

        const newJobs = res.data;
        if (append) {
          this.scheduledJobs.update(current => {
            const combined = [...current, ...newJobs];
            return Array.from(new Map(combined.map(item => [item.id, item])).values())
              .sort((a, b) => this.sortJobs(a, b));
          });
        } else {
          const sorted = [...newJobs].sort((a, b) => this.sortJobs(a, b));
          this.scheduledJobs.set(sorted);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  loadMore(): void {
    if (this.hasMore() && !this.isLoading()) {
      this.currentPage.update(p => p + 1);
      this.loadScheduledJobs(true);
    }
  }

  private sortJobs(a: Inspection, b: Inspection): number {
    const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
    const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
    return dateA - dateB;
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
        template_id: job.template_id || '',
        send_email: true, // Default to true on edit too, or use a value if it exists in job
      });
    } else {
      this.isEditMode.set(false);
      this.editingJob.set(null);
      this.showBookingForm.update((v) => !v);
      if (!this.showBookingForm()) {
        this.bookingForm.reset();
        this.loadInspectorDefaults();
        this.errorMessage.set(null);
      }
    }
  }

  onSubmit(): void {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formData = this.bookingForm.value;
    const jobData = {
      ...formData,
      // Ensure date is in ISO format for the backend
      scheduled_date: formData.scheduled_date ? new Date(formData.scheduled_date).toISOString() : null,
      // Normalize empty strings to null for optional fields
      client_email: formData.client_email || null,
      client_phone: formData.client_phone || null,
      // Ensure agreed_price is a number or null, avoiding empty strings or undefined
      agreed_price: (formData.agreed_price === '' || formData.agreed_price === null || formData.agreed_price === undefined) ? null : Number(formData.agreed_price),
      // Remove template_id if empty to avoid validation errors
      template_id: formData.template_id || undefined,
      send_email: formData.send_email
    };

    const request = this.isEditMode()
      ? this.inspectionsService.updateInspection(this.editingJob()!.id, jobData)
      : this.inspectionsService.createInspection(jobData);

    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toggleBookingForm();
        this.loadScheduledJobs();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Failed to save inspection. Please try again.');
        console.error(err);
      },
    });
  }

  deleteJob(job: Inspection): void {
    this.inspectionsService.deleteInspection(job.id).subscribe({
      next: () => {
        this.scheduledJobs.update((jobs) => jobs.filter((j) => j.id !== job.id));
        this.confirmingJobId.set(null);
        this.confirmationType.set(null);
      },
      error: (err) => {
        console.error('Failed to delete job', err);
        alert('Failed to delete job. Please try again.');
        this.confirmingJobId.set(null);
        this.confirmationType.set(null);
      },
    });
  }

  cancelJob(job: Inspection): void {
    this.inspectionsService.cancelInspection(job.id).subscribe({
      next: (updated) => {
        this.scheduledJobs.update((jobs) =>
          jobs.map((j) => (j.id === updated.id ? updated : j))
        );
        this.confirmingJobId.set(null);
        this.confirmationType.set(null);
      },
      error: (err) => {
        console.error('Failed to cancel job', err);
        alert('Failed to cancel job. Please try again.');
        this.confirmingJobId.set(null);
        this.confirmationType.set(null);
      },
    });
  }

  onCancelJob(job: Inspection): void {
    this.confirmingJobId.set(job.id);
    this.confirmationType.set('cancel');
  }

  onDeleteJob(job: Inspection): void {
    this.confirmingJobId.set(job.id);
    this.confirmationType.set('delete');
  }

  onConfirm(job: Inspection): void {
    if (this.confirmationType() === 'delete') {
      this.deleteJob(job);
    } else {
      this.cancelJob(job);
    }
  }

  onCancelConfirmation(): void {
    this.confirmingJobId.set(null);
    this.confirmationType.set(null);
  }

  formatDate(dateStr?: string | Date): string {
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

  public isToday(dateStr?: string | Date): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  public isPast(dateStr?: string | Date): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
}
