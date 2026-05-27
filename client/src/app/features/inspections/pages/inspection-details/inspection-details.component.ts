import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { Finding, Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FindingCardComponent } from '../../components/finding-card/finding-card.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { LucideAngularModule, ArrowLeft, Send, RefreshCw, AlertCircle, Plus, X, Check, Loader2, FileText, Download, LockOpen, Edit, Camera, Image, Cloud, Thermometer, Calendar, Maximize, Home, Users, ChevronDown, Trash2, Eye, ExternalLink } from 'lucide-angular';
import { ReportGeneratorComponent } from '../../../reports/components/report-generator/report-generator.component';
import { ReportPreviewComponent } from '../../../reports/components/report-preview/report-preview.component';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';

import { ImageCompressionService } from '../../../../core/services/image-compression.service';
import { environment } from '../../../../../environments/environment';
import { ResolveImagePipe } from '../../../../shared/pipes/resolve-image.pipe';
import { ImageCacheService } from '../../../../core/services/image-cache.service';

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
    ReportPreviewComponent,
    BackButtonComponent,

    ResolveImagePipe
  ],
  templateUrl: './inspection-details.component.html',
  styleUrl: './inspection-details.component.scss',
})
export class InspectionDetailsComponent implements OnInit, OnDestroy {
  @ViewChild(ReportGeneratorComponent) reportGenerator?: ReportGeneratorComponent;
  @ViewChild(ReportPreviewComponent) reportPreview?: ReportPreviewComponent;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspectionsService = inject(InspectionsService);
  private reportsService = inject(ReportsService);
  private compressionService = inject(ImageCompressionService);
  private elementRef = inject(ElementRef);
  private imageCache = inject(ImageCacheService);

  inspection = signal<Inspection | null>(null);
  resolvedCoverPhoto = signal<string>('');
  isLoading = signal<boolean>(true);
  isPublishing = signal<boolean>(false);
  isUploadingCover = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  showPublishModal = signal(false);
  selectedSection = signal<string>('');
  isDeletingFinding = signal<boolean>(false);
  deletingId = signal<string | null>(null);
  publishState = signal<'idle' | 'confirm' | 'compiling' | 'uploading' | 'success' | 'error'>('idle');
  isGeneratingPdf = signal<boolean>(false);
  isReportGeneratorActive = signal<boolean>(false);
  reportGeneratorMode = signal<'download' | 'publish'>('download');
  isCopying = signal<boolean>(false);
  copyLinkSuccess = signal<boolean>(false);
  isActionsMenuOpen = signal<boolean>(false);
  
  isSharePanelOpen = signal<boolean>(false);
  isSendingReport = signal<boolean>(false);
  shareSuccess = signal<boolean>(false);
  overrideEmail = signal<string>('');
  
  combinedProgress = signal<number>(0);
  combinedMessage = signal<string>('Initializing document engine...');
  private uploadIntervalId: any = null;

  readonly icons = { ArrowLeft, Send, RefreshCw, AlertCircle, Plus, X, Check, Loader2, FileText, Download, LockOpen, Edit, Camera, Image, Cloud, Thermometer, Calendar, Maximize, Home, Users, ChevronDown, Trash2, Eye, ExternalLink };

  readonly apiUrl = environment.apiUrl.replace('/api', '');

  isPublished = computed(() => this.inspection()?.status === 'published');
  isScheduled = computed(() => this.inspection()?.status === 'scheduled');
  isCancelled = computed(() => this.inspection()?.status === 'cancelled');
  hasFindings = computed(() => (this.inspection()?.findings?.length ?? 0) > 0);

  toggleActionsMenu(event: Event): void {
    event.stopPropagation();
    this.isActionsMenuOpen.update(open => !open);
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: EventTarget | null) {
    if (!targetElement) return;
    const clickedInside = this.elementRef.nativeElement.contains(targetElement as Node);
    if (!clickedInside) {
      this.isActionsMenuOpen.set(false);
    }
  }

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
      },
      {
        label: 'Informational Items',
        severity: 'informational',
        colorClass: 'group-informational',
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

  ngOnDestroy(): void {
    this.clearUploadInterval();
  }

  loadInspection(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.inspectionsService.getInspectionById(id).subscribe({
      next: async (data) => {
        console.log('=== LOADED INSPECTION FROM SWR/DB ===', data);
        
        if (data.cover_photo_url) {
          try {
            const cached = await this.imageCache.getImageUrl(data.cover_photo_url);
            this.resolvedCoverPhoto.set(cached);
          } catch (e) {
            this.resolvedCoverPhoto.set(data.cover_photo_url);
          }
        } else {
          this.resolvedCoverPhoto.set('');
        }

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

    this.publishState.set('compiling');
    this.reportGeneratorMode.set('publish');
    this.combinedProgress.set(0);
    this.combinedMessage.set('Initializing document engine...');
    this.clearUploadInterval();
    this.isReportGeneratorActive.set(true);
  }

  onGeneratorProgress(event: { progress: number, message: string }): void {
    if (this.publishState() === 'compiling') {
      const mappedProgress = Math.round((event.progress / 100) * 75);
      this.combinedProgress.set(mappedProgress);
      this.combinedMessage.set(event.message);
    }
  }

  onReportHtmlReady(html: string): void {
    const inspection = this.inspection();
    if (!inspection) return;

    this.publishState.set('uploading');
    this.clearUploadInterval();

    let currentProgress = 75;
    this.combinedProgress.set(currentProgress);

    const uploadSteps = [
      'Transmitting secure draft to server...',
      'Compiling final print assets...',
      'Processing images & document flow...',
      'Generating archival-grade PDF...',
      'Optimizing file structure...',
      'Verifying report integrity...',
      'Saving official record...'
    ];
    let stepIndex = 0;
    this.combinedMessage.set(uploadSteps[stepIndex]);

    this.uploadIntervalId = setInterval(() => {
      // Easing simulation: slower as we approach 98%
      if (currentProgress < 85) {
        currentProgress += 1.5;
      } else if (currentProgress < 92) {
        currentProgress += 0.8;
      } else if (currentProgress < 97) {
        currentProgress += 0.3;
      } else if (currentProgress < 98) {
        currentProgress += 0.1;
      }

      this.combinedProgress.set(Math.min(parseFloat(currentProgress.toFixed(1)), 98));

      // Randomly cycle status messages to feel premium and alive
      if (Math.random() < 0.12 && stepIndex < uploadSteps.length - 1) {
        stepIndex++;
        this.combinedMessage.set(uploadSteps[stepIndex]);
      }
    }, 250);

    this.inspectionsService.publishInspection(inspection.id, html).subscribe({
      next: (updated) => {
        console.log('=== RETURNED INSPECTION AFTER PUBLISH ===', updated);
        this.clearUploadInterval();
        this.combinedProgress.set(100);
        this.combinedMessage.set('Report successfully published!');
        
        this.inspection.set(updated);
        this.publishState.set('success');
        this.isReportGeneratorActive.set(false);
        setTimeout(() => {
          this.publishState.set('idle');
        }, 3000);
      },
      error: (err) => {
        console.error('Failed to publish inspection', err);
        this.clearUploadInterval();
        this.errorMessage.set(err.error?.message || 'Failed to publish inspection.');
        this.publishState.set('error');
        this.isReportGeneratorActive.set(false);
      },
    });
  }

  private clearUploadInterval(): void {
    if (this.uploadIntervalId) {
      clearInterval(this.uploadIntervalId);
      this.uploadIntervalId = null;
    }
  }

  unpublishInspection(): void {
    const inspection = this.inspection();
    if (!inspection) return;

    this.isLoading.set(true);
    this.inspectionsService.unpublishInspection(inspection.id).subscribe({
      next: (updated) => {
        this.inspection.set(updated);
        // Ensure IndexedDB cache is fully synchronized and written to disk before unlocking the UI
        setTimeout(() => {
          this.isLoading.set(false);
        }, 200);
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
        // Fetch the fresh inspection details and immediately redirect to the workbench
        this.inspectionsService.getInspectionById(inspection.id).subscribe({
          next: (fresh) => {
            this.inspection.set(fresh);
            this.isLoading.set(false);
            this.routeToWorkbench();
          },
          error: (err) => {
            console.warn('Failed to fetch fresh details, routing with existing cache', err);
            this.isLoading.set(false);
            this.routeToWorkbench();
          }
        });
      },
      error: (err) => {
        console.error('Failed to start inspection', err);
        this.errorMessage.set(err.error?.message || 'Failed to start inspection.');
        this.isLoading.set(false);
      }
    });
  }

  onCancel(): void {
    const id = this.inspection()?.id;
    if (!id) return;

    if (confirm('Are you sure you want to cancel this inspection? This will lock the record permanently.')) {
      this.isLoading.set(true);
      this.inspectionsService.cancelInspection(id).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.loadInspection(id);
        },
        error: (err) => {
          console.error('Failed to cancel inspection', err);
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Failed to cancel inspection.');
        }
      });
    }
  }

  generateReport(): void {
    this.isGeneratingPdf.set(true);
    this.reportGeneratorMode.set('download');
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
    this.clearUploadInterval();
    this.errorMessage.set(error);
    this.publishState.set('error');
  }

  copyReportLink(): void {
    const inspection = this.inspection();
    if (!inspection) return;

    const fullUrl = `${window.location.origin}/report/${inspection.id}`;
    this.isCopying.set(true);
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.copyLinkSuccess.set(true);
      setTimeout(() => {
        this.copyLinkSuccess.set(false);
        this.isCopying.set(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy link', err);
      this.isCopying.set(false);
    });
  }

  downloadPublishedReport(): void {
    const inspection = this.inspection();
    if (!inspection) return;

    const fileUrl = inspection.report?.pdf_url || `${this.apiUrl}/uploads/reports/${inspection.id}.pdf`;
    const safeAddress = inspection.address || 'Inspection';
    const filename = `Report-${safeAddress.replace(/ /g, '_')}.pdf`;

    fetch(fileUrl)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Failed to download report via fetch, opening in new tab', err);
        window.open(fileUrl, '_blank');
      });
  }

  toggleSharePanel(): void {
    if (!this.isSharePanelOpen()) {
      this.isSharePanelOpen.set(true);
      this.overrideEmail.set(this.inspection()?.client_email || '');
    } else {
      this.isSharePanelOpen.set(false);
    }
  }

  onEmailChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.overrideEmail.set(input.value);
  }

  sendReportToClient(): void {
    const inspectionId = this.inspection()?.id;
    const email = this.overrideEmail();
    if (!inspectionId || !email) return;

    this.isSendingReport.set(true);
    this.errorMessage.set(null);

    this.inspectionsService.sendReportToClient(inspectionId, email).subscribe({
      next: (updated) => {
        this.inspection.set(updated);
        this.isSendingReport.set(false);
        this.shareSuccess.set(true);
        setTimeout(() => {
          this.shareSuccess.set(false);
          this.isSharePanelOpen.set(false);
        }, 3000);
      },
      error: (err) => {
        console.error('Failed to send report', err);
        this.errorMessage.set(err.error?.message || 'Failed to send report.');
        this.isSendingReport.set(false);
      }
    });
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
        next: async (updated) => {
          if (updated.cover_photo_url) {
            try {
              const cached = await this.imageCache.getImageUrl(updated.cover_photo_url);
              this.resolvedCoverPhoto.set(cached);
            } catch (e) {
              this.resolvedCoverPhoto.set(updated.cover_photo_url);
            }
          } else {
            this.resolvedCoverPhoto.set('');
          }
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

  openReportPreview(): void {
    this.reportPreview?.openPreview();
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
