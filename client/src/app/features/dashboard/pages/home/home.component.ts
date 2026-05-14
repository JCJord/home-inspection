import { Component, inject, signal, OnInit } from '@angular/core';
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
      useValue: { Calendar, Play, MapPin, Clock, DollarSign, ArrowRight },
    },
  ],
})
export class HomeComponent implements OnInit {
  authService = inject(AuthService);
  private inspectionsService = inject(InspectionsService);
  private router = inject(Router);

  todaysJobs = signal<Inspection[]>([]);
  isLoadingAgenda = signal<boolean>(true);
  startingJobId = signal<string | null>(null);

  readonly icons = { Calendar, Play, MapPin, Clock, DollarSign, ArrowRight };

  ngOnInit(): void {
    this.loadTodaysAgenda();
  }

  private loadTodaysAgenda(): void {
    this.isLoadingAgenda.set(true);
    this.inspectionsService.getInspections(1, 50, true, 'scheduled').subscribe({
      next: (res) => {
        const today = new Date();
        const todaysJobs = res.data.filter((job) => {
          if (!job.scheduled_date || job.status === 'cancelled') return false;
          const jobDate = new Date(job.scheduled_date);
          return (
            jobDate.getDate() === today.getDate() &&
            jobDate.getMonth() === today.getMonth() &&
            jobDate.getFullYear() === today.getFullYear()
          );
        });
        // Sort by time ascending
        todaysJobs.sort((a, b) => {
          const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
          const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
          return dateA - dateB;
        });
        this.todaysJobs.set(todaysJobs);
        this.isLoadingAgenda.set(false);
      },
      error: () => {
        this.isLoadingAgenda.set(false);
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

  goToSchedule(): void {
    this.router.navigate(['/schedule']);
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  formatPrice(price?: number): string {
    if (price === null || price === undefined) return '';
    return `$${Number(price).toFixed(2)}`;
  }
}
