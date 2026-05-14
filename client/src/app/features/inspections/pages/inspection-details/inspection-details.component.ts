import { Component, OnInit, signal, computed, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { Finding, Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FindingCardComponent } from '../../components/finding-card/finding-card.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { LucideAngularModule, ArrowLeft, Send, RefreshCw, AlertCircle, Plus, X, Check, Loader2, FileText, Download, LockOpen, Edit, Camera, Image, Cloud, Thermometer, Calendar, Maximize, Home, Users } from 'lucide-angular';
import { ReportGeneratorComponent } from '../../../reports/components/report-generator/report-generator.component';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { ImageCompressionService } from '../../../../core/services/image-compression.service';
import { environment } from '../../../../../environments/environment';
import { ResolveImagePipe } from '../../../../shared/pipes/resolve-image.pipe';

@Component({
  selector: 'app-inspection-details',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    FindingCardComponent,
    LucideAngularModule,
    SkeletonComponent,
    ReportGeneratorComponent,
    BackButtonComponent,
    ResolveImagePipe
  ],
  templateUrl: './inspection-details.component.html',
  styleUrl: './inspection-details.component.scss',
})
export class InspectionDetailsComponent implements OnInit {
  @ViewChild(ReportGeneratorComponent) reportGenerator!: ReportGeneratorComponent;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspectionsService = inject(InspectionsService);
  private reportsService = inject(ReportsService);
  private compressionService = inject(ImageCompressionService);

  inspection = signal<Inspection | null>(null);
  isLoading = signal<boolean>(true);
  isPublishing = signal<boolean>(false);
  isUploadingCover = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  showPublishModal = signal(false);
  selectedSection = signal<string>('');
  isDeletingFinding = signal<boolean>(false);
  deletingId = signal<string | null>(null);
  publishState = signal<'idle' | 'confirm' | 'loading' | 'success'>('idle');
  isGeneratingPdf = signal<boolean>(false);
  isReportGeneratorActive = signal<boolean>(false);

  readonly icons = { ArrowLeft, Send, RefreshCw, AlertCircle, Plus, X, Check, Loader2, FileText, Download, LockOpen, Edit, Camera, Image, Cloud, Thermometer, Calendar, Maximize, Home, Users };
  readonly apiUrl = environment.apiUrl.replace('/api', '');

  isPublished = computed(() => this.inspection()?.status === 'published');
  isScheduled = computed(() => this.inspection()?.status === 'scheduled');
  hasFindings = computed(() => (this.inspection()?.findings?.length ?? 0) > 0);

  groupedFindings = computed(() => {
    const findings = this.inspection()?.findings || [];

    const groups = [
      {
        label: 'Critical & Safety Hazards',
        severity: 'critical',
        colorClass: 'group-critical',
        items: [] as Finding[]
      },
      {
        label: 'Major Defects',
        severity: 'major',
        colorClass: 'group-major',
        items: [] as Finding[]
      },
      {
        label: 'Maintenance & Minor Items',
        severity: 'minor',
        colorClass: 'group-minor',
        items: [] as Finding[]
      }
    ];

    findings.forEach(f => {
      const severity = f.severity.toLowerCase();
      // Map 'safety' to 'critical', and 'maintenance' to 'minor'
      let targetSeverity = severity;
      if (severity === 'safety') targetSeverity = 'critical';
      if (severity === 'maintenance') targetSeverity = 'minor';

      const group = groups.find(g => g.severity === targetSeverity);
      if (group) {
        group.items.push(f);
      }
    });

    return groups.filter(g => g.items.length > 0);
  });

  currentSection = computed(() => {
    const sections = this.inspection()?.template_snapshot?.sections || [];
    return sections.find(s => s.name === this.selectedSection()) || null;
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
        if (data.template_snapshot?.sections?.length && !this.selectedSection()) {
          this.selectedSection.set(data.template_snapshot.sections[0].name);
        }
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

  unpublishInspection(): void {
    const inspection = this.inspection();
    if (!inspection) return;

    this.isLoading.set(true);
    this.inspectionsService.unpublishInspection(inspection.id).subscribe({
      next: (updated) => {
        this.inspection.set(updated);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to unpublish inspection', err);
        this.errorMessage.set(err.error?.message || 'Failed to unlock inspection.');
        this.isLoading.set(false);
      },
    });
  }

  onStartInspection(): void {
    const inspection = this.inspection();
    if (!inspection) return;

    this.isLoading.set(true);
    this.inspectionsService.startInspection(inspection.id).subscribe({
      next: () => {
        // Trigger a fresh fetch so UI reactively shows everything
        this.loadInspection(inspection.id);
      },
      error: (err) => {
        console.error('Failed to start inspection', err);
        this.errorMessage.set(err.error?.message || 'Failed to start inspection.');
        this.isLoading.set(false);
      }
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
    const safeAddress = inspection.address || 'Inspection';
    a.download = `Report-${safeAddress.replace(/ /g, '_')}.pdf`;
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

  editInspection(): void {
    const inspection = this.inspection();
    if (!inspection) return;
    this.router.navigate(['/inspections', inspection.id, 'edit']);
  }

  addFinding(): void {
    this.router.navigate(['/inspections', this.inspection()!.id, 'findings', 'new'], {
      queryParams: { section: this.selectedSection() }
    });
  }

  editFinding(finding: Finding): void {
    this.router.navigate(['/inspections', this.inspection()!.id, 'findings', finding.id], {
      queryParams: { section: finding.section }
    });
  }

  async onCoverPhotoSelected(event: Event): Promise<void> {
    const inspectionId = this.inspection()?.id;
    if (!inspectionId) return;

    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.isUploadingCover.set(true);
    try {
      const compressedFile = await this.compressionService.compressImage(file, {
        maxWidthOrHeight: 1600, // Slightly higher for cover photo
        initialQuality: 0.8
      });

      this.inspectionsService.uploadCoverPhoto(inspectionId, compressedFile).subscribe({
        next: (updated) => {
          this.inspection.set(updated);
          this.isUploadingCover.set(false);
        },
        error: (err) => {
          console.error('Failed to upload cover photo', err);
          this.errorMessage.set('Failed to upload cover photo.');
          this.isUploadingCover.set(false);
        }
      });
    } catch (err) {
      console.error('Compression error', err);
      this.isUploadingCover.set(false);
    }
  }

  routeToWorkbench(): void {
    const insp = this.inspection();
    if (!insp) return;

    // JOB BOOT: If online, trigger a fresh fetch to ensure cache is fully hydrated (Fat Payload)
    if (navigator.onLine) {
      this.inspectionsService.getInspectionById(insp.id).subscribe({
        next: (fresh) => this.inspection.set(fresh),
        error: (err) => console.warn('Job Boot fetch failed, proceeding with existing cache', err)
      });
    }

    // Determine target section: current selection OR first section with findings OR first section
    const findings = insp.findings || [];
    let targetSection = this.selectedSection();

    // If no findings in current section, try to find a section that HAS findings
    if (!findings.some(f => f.section === targetSection)) {
      const sectionWithFindings = insp.template_snapshot?.sections?.find(s =>
        findings.some(f => f.section === s.name)
      );
      if (sectionWithFindings) {
        targetSection = sectionWithFindings.name;
      }
    }

    // Default to first section if still empty
    if (!targetSection && insp.template_snapshot?.sections?.length) {
      targetSection = insp.template_snapshot.sections[0].name;
    }

    const sectionFindings = findings.filter(f => f.section === targetSection);

    if (sectionFindings.length > 0) {
      // Land on first existing finding
      this.router.navigate(['/inspections', insp.id, 'findings', sectionFindings[0].id], {
        queryParams: { section: targetSection }
      });
    } else {
      // Land on 'new' state
      this.router.navigate(['/inspections', insp.id, 'findings', 'new'], {
        queryParams: { section: targetSection }
      });
    }
  }



}
