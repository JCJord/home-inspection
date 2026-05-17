import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import {
  LucideAngularModule,
  Calendar,
  Play,
  MapPin,
  Clock,
  DollarSign,
  ArrowRight,
  Phone,
  Navigation,
  FileText,
  CheckCircle,
  TrendingUp,
  Plus,
  Users,
  Layout,
  ChevronRight,
} from 'lucide-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LucideAngularModule, SkeletonComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  providers: [
    {
      provide: 'lucideIcons',
      useValue: {
        Calendar,
        Play,
        MapPin,
        Clock,
        DollarSign,
        ArrowRight,
        Phone,
        Navigation,
        FileText,
        CheckCircle,
        TrendingUp,
        Plus,
        Users,
        Layout,
        ChevronRight,
      },
    },
  ],
})
export class HomeComponent implements OnInit {
  authService = inject(AuthService);
  private inspectionsService = inject(InspectionsService);
  private router = inject(Router);

  // --- State ---
  allInspections = signal<Inspection[]>([]);
  isLoading = signal<boolean>(true);
  startingJobId = signal<string | null>(null);

  readonly icons = {
    Calendar,
    Play,
    MapPin,
    Clock,
    DollarSign,
    ArrowRight,
    Phone,
    Navigation,
    FileText,
    CheckCircle,
    TrendingUp,
    Plus,
    Users,
    Layout,
    ChevronRight,
  };

  // --- Computed Metrics ---
  userName = computed(() => this.authService.currentUser()?.name || 'Inspector');

  userGreeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  today = computed(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  });

  todaysJobs = computed(() => {
    const now = new Date();
    return this.allInspections()
      .filter((job) => {
        if (!job.scheduled_date || job.status === 'cancelled') return false;
        const jobDate = new Date(job.scheduled_date);
        return (
          jobDate.getDate() === now.getDate() &&
          jobDate.getMonth() === now.getMonth() &&
          jobDate.getFullYear() === now.getFullYear()
        );
      })
      .sort((a, b) => {
        const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
        const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
        return dateA - dateB;
      });
  });

  tomorrowJobs = computed(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.allInspections()
      .filter((job) => {
        if (!job.scheduled_date || job.status === 'cancelled') return false;
        const jobDate = new Date(job.scheduled_date);
        return (
          jobDate.getDate() === tomorrow.getDate() &&
          jobDate.getMonth() === tomorrow.getMonth() &&
          jobDate.getFullYear() === tomorrow.getFullYear()
        );
      })
      .slice(0, 2);
  });

  activeInspection = computed(() => {
    return this.allInspections().find((job) => job.status === 'in_progress');
  });

  activeJobProgress = computed(() => {
    const job = this.activeInspection();
    if (!job || !job.section_statuses) return 0;
    
    const statuses = Object.values(job.section_statuses);
    if (statuses.length === 0) return 0;
    
    const completed = statuses.filter(s => s.status !== 'not_inspected').length;
    return Math.round((completed / statuses.length) * 100);
  });

  stats = computed(() => {
    const inspections = this.allInspections();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthInspections = inspections.filter((i) => {
      if (!i.scheduled_date) return false;
      const d = new Date(i.scheduled_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const publishedThisMonth = monthInspections.filter((i) => i.status === 'published');
    const revenue = publishedThisMonth.reduce((acc, i) => acc + (i.agreed_price || 0), 0);

    const reportsDue = inspections.filter((i) => i.status === 'in_progress').length;

    return {
      todayCount: this.todaysJobs().length,
      reportsDue: reportsDue,
      monthJobsCount: monthInspections.length,
      monthRevenue: revenue,
    };
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    // Fetch a larger batch to support stats calculation
    this.inspectionsService.getInspections(1, 100, true).subscribe({
      next: (res) => {
        this.allInspections.set(res.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  startInspection(job: Inspection): void {
    this.startingJobId.set(job.id);
    this.inspectionsService.startInspection(job.id).subscribe({
      next: () => {
        this.startingJobId.set(null);
        this.router.navigate(['/inspections', job.id]);
      },
      error: (err) => {
        console.error('Failed to start inspection', err);
        this.startingJobId.set(null);
      },
    });
  }

  resumeInspection(job: Inspection): void {
    this.router.navigate(['/inspections', job.id]);
  }

  goToSchedule(): void {
    this.router.navigate(['/schedule']);
  }

  goToTemplates(): void {
    this.router.navigate(['/templates']);
  }

  goToClients(): void {
    this.router.navigate(['/clients']);
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  formatPrice(price?: number): string {
    if (price === null || price === undefined) return '$0.00';
    return `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  callClient(phone: string, event: Event): void {
    event.stopPropagation();
    window.location.href = `tel:${phone}`;
  }

  getDirections(address: string, event: Event): void {
    event.stopPropagation();
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  }
}
