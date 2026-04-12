import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { SectionTabsComponent } from '../../components/section-tabs/section-tabs.component';
import { Section } from '../../../../core/enums/inspection.enums';
import { LucideAngularModule, ArrowLeft, Send, RefreshCw, AlertCircle } from 'lucide-angular';

@Component({
  selector: 'app-inspection-details',
  standalone: true,
  imports: [CommonModule, ButtonComponent, ConfirmModalComponent, SectionTabsComponent, LucideAngularModule],
  templateUrl: './inspection-details.component.html',
  styleUrl: './inspection-details.component.scss',
})
export class InspectionDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspectionsService = inject(InspectionsService);

  inspection = signal<Inspection | null>(null);
  isLoading = signal<boolean>(true);
  isPublishing = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  showPublishModal = signal(false);
  selectedSection = signal<Section>(Section.EXTERIOR);

  readonly icons = { ArrowLeft, Send, RefreshCw, AlertCircle };

  isPublished = computed(() => this.inspection()?.status === 'published');
  hasFindings = computed(() => (this.inspection()?.findings?.length ?? 0) > 0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInspection(id);
    } else {
      this.router.navigate(['/inspections']);
    }
  }

  loadInspection(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.inspectionsService.getInspectionById(id).subscribe({
      next: (data) => {
        this.inspection.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load inspection', err);
        this.errorMessage.set('Could not load inspection details.');
        this.isLoading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/inspections']);
  }

  confirmPublish(): void {
    const inspection = this.inspection();
    if (!inspection) return;

    this.isPublishing.set(true);
    this.showPublishModal.set(false);
    this.inspectionsService.publishInspection(inspection.id).subscribe({
      next: (updated) => {
        this.inspection.set(updated);
        this.isPublishing.set(false);
      },
      error: (err) => {
        console.error('Failed to publish inspection', err);
        this.errorMessage.set(err.error?.message || 'Failed to publish inspection.');
        this.isPublishing.set(false);
      },
    });
  }
}
