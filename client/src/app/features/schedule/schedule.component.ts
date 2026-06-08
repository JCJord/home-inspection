import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { InspectionsService } from '../../core/services/inspections.service';
import { Inspection } from '../../core/models/inspection.interface';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { SearchInputComponent } from '../../shared/components/inputs/search-input/search-input.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
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

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LucideAngularModule,
    ButtonComponent,
    SearchInputComponent,
    SkeletonComponent,
    ScheduledJobCardComponent,
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
  private inspectionsService = inject(InspectionsService);
  private templatesService = inject(TemplatesService);
  private router = inject(Router);

  scheduledJobs = signal<Inspection[]>([]);
  templates = this.templatesService.templates;
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

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
  dateFilter = signal<'all' | 'today' | 'week' | 'month' | 'cancelled'>('all');

  hasMore = computed(() => this.scheduledJobs().length < this.totalCount());
  filteredJobs = computed(() => this.scheduledJobs());
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

  ngOnInit(): void {
    this.loadScheduledJobs();
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
      this.loadScheduledJobs();
    });
  }

  setDateFilter(filter: 'all' | 'today' | 'week' | 'month' | 'cancelled'): void {
    this.dateFilter.set(filter);
    this.currentPage.set(1);
    this.loadScheduledJobs();
  }

  loadScheduledJobs(append: boolean = false): void {
    if (!append) {
      this.currentPage.set(1);
    }
    
    this.isLoading.set(!append);
    const page = !append ? 1 : this.currentPage();
    const limit = this.pageSize();
    const search = this.searchQuery().trim() || undefined;

    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;
    let statusQuery: string | undefined = undefined;

    const filter = this.dateFilter();
    const today = new Date();

    if (filter === 'all') {
      statusQuery = undefined;
    } else if (filter === 'today') {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      startDate = start.toISOString();
      endDate = end.toISOString();
    } else if (filter === 'week') {
      const start = new Date(today);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      startDate = start.toISOString();
      endDate = end.toISOString();
    } else if (filter === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      startDate = start.toISOString();
      endDate = end.toISOString();
    } else if (filter === 'cancelled') {
      statusQuery = 'cancelled';
    }

    this.inspectionsService.getInspections(page, limit, true, statusQuery, search, startDate, endDate).subscribe({
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

  goToBookJob(): void {
    this.router.navigate(['/inspections/new']);
  }

  editJob(job: Inspection): void {
    this.router.navigate(['/inspections', job.id, 'edit']);
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
