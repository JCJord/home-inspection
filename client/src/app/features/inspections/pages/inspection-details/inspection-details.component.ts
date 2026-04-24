import { Component, OnInit, signal, computed, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { Finding, Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SectionTabsComponent } from '../../components/section-tabs/section-tabs.component';
import { FindingFormComponent } from '../../components/finding-form/finding-form.component';
import { FindingCardComponent } from '../../components/finding-card/finding-card.component';
import { Section } from '../../../../core/enums/inspection.enums';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { LucideAngularModule, ArrowLeft, Send, RefreshCw, AlertCircle, Plus, X, Check, Loader2, FileText, Download } from 'lucide-angular';
import { ReportGeneratorComponent } from '../../../reports/components/report-generator/report-generator.component';


@Component({
  selector: 'app-inspection-details',
  standalone: true,
  imports: [CommonModule, ButtonComponent, SectionTabsComponent, FindingFormComponent, FindingCardComponent, LucideAngularModule, SkeletonComponent, ReportGeneratorComponent],
  templateUrl: './inspection-details.component.html',
  styleUrl: './inspection-details.component.scss',
})
export class InspectionDetailsComponent implements OnInit {
  @ViewChild(ReportGeneratorComponent) reportGenerator!: ReportGeneratorComponent;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspectionsService = inject(InspectionsService);
  private reportsService = inject(ReportsService);

  inspection = signal<Inspection | null>(null);
  isLoading = signal<boolean>(true);
  isPublishing = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  showPublishModal = signal(false);
  findingToEdit = signal<Finding | null>(null);
  selectedSection = signal<Section>(Section.EXTERIOR);
  isAddingFinding = signal<boolean>(false);
  isDeletingFinding = signal<boolean>(false);
  deletingId = signal<string | null>(null);
  publishState = signal<'idle' | 'confirm' | 'loading' | 'success'>('idle');
  isGeneratingPdf = signal<boolean>(false);
  isReportGeneratorActive = signal<boolean>(false);

  readonly icons = { ArrowLeft, Send, RefreshCw, AlertCircle, Plus, X, Check, Loader2, FileText, Download };

  isPublished = computed(() => this.inspection()?.status === 'published');
  hasFindings = computed(() => (this.inspection()?.findings?.length ?? 0) > 0);

  sectionFindings = computed(() => {
    const findings = this.inspection()?.findings || [];
    return findings.filter(f => f.section === this.selectedSection());
  });

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

  startPublishWorkflow(): void {
    this.publishState.set('confirm');
  }

  cancelPublish(): void {
    this.publishState.set('idle');
  }

  confirmPublishPDF(): void {
    const inspection = this.inspection();
    if (!inspection) return;

    this.publishState.set('loading');
    this.inspectionsService.publishInspection(inspection.id).subscribe({
      next: (updated) => {
        this.inspection.set(updated);
        this.publishState.set('success');
        // Reset to idle after a delay if needed, or stay success
        setTimeout(() => {
          this.publishState.set('idle');
        }, 3000);
      },
      error: (err) => {
        console.error('Failed to publish inspection', err);
        this.errorMessage.set(err.error?.message || 'Failed to publish inspection.');
        this.publishState.set('idle');
      },
    });
  }

  generateReport(): void {
    this.isGeneratingPdf.set(true);
    this.isReportGeneratorActive.set(true);
  }

  onReportCompleted(blob: Blob): void {
    this.isGeneratingPdf.set(false);
    this.isReportGeneratorActive.set(false);
    const inspection = this.inspection();
    if (!inspection) return;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report-${inspection.address.replace(/ /g, '_')}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  onReportError(error: string): void {
    this.isGeneratingPdf.set(false);
    this.isReportGeneratorActive.set(false);
    this.errorMessage.set(error);
  }

  handleDeleteFinding(finding: Finding): void {
    const inspectionId = this.inspection()?.id;
    if (!inspectionId || !finding.id) return;

    this.deletingId.set(finding.id);
    this.isDeletingFinding.set(true);

    // Wait for the animation to play before calling the service
    setTimeout(() => {
      this.inspectionsService.deleteFinding(inspectionId, finding.id).subscribe({
        next: () => {
          this.isDeletingFinding.set(false);
          this.deletingId.set(null);
          this.loadInspection(inspectionId);
        },
        error: (err) => {
          console.error('Failed to delete finding', err);
          this.errorMessage.set(err.error?.message || 'Failed to delete finding.');
          this.isDeletingFinding.set(false);
          this.deletingId.set(null);
        }
      });
    }, 400);
  }

  editFinding(finding: any): void {
    this.findingToEdit.set(finding);
  }

  cancelFindingForm(): void {
    this.isAddingFinding.set(false);
    this.findingToEdit.set(null);
  }

  onFindingSaved(finding: any): void {
    this.cancelFindingForm();
    // Reload inspection to get updated findings
    this.loadInspection(this.inspection()!.id);
  }

}
