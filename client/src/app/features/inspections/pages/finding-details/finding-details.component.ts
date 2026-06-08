import { Component, OnInit, inject, signal, computed, ViewChild, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection, Finding, SectionStatus } from '../../../../core/models/inspection.interface';
import { Severity } from '../../../../core/enums/inspection.enums';
import { WorkbenchLayoutComponent } from '../../../../shared/components/workbench-layout/workbench-layout.component';
import { FindingFormComponent } from '../../components/finding-form/finding-form.component';
import { FindingListComponent } from '../../components/finding-list/finding-list';
import { LucideAngularModule, Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu, ChevronLeft, LayoutGrid, CircleX, PieChart, Eye, LayoutList } from 'lucide-angular';

import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SectionStatusToggleComponent } from '../../components/section-status-toggle/section-status-toggle';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { SelectInputComponent } from '../../../../shared/components/inputs/select-input/select-input.component';
import { SummaryDashboardComponent } from '../../components/summary-dashboard/summary-dashboard.component';
import { MutationQueueService, MutationType, TaskCompletion } from '../../../../core/services/mutation-queue.service';
import { DraftService } from '../../../../core/services/draft.service';
import { debounceTime, Subject, switchMap, catchError, of } from 'rxjs';

@Component({
  selector: 'app-finding-details',
  standalone: true,
  imports: [CommonModule, WorkbenchLayoutComponent, FindingFormComponent, FindingListComponent, LucideAngularModule, BackButtonComponent, ButtonComponent, SectionStatusToggleComponent, TextInputComponent, SelectInputComponent, SummaryDashboardComponent],
  providers: [{ provide: 'lucideIcons', useValue: { Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu, ChevronLeft, LayoutGrid, CircleX, PieChart, LayoutList } }],
  templateUrl: './finding-details.component.html',
  styleUrl: './finding-details.component.scss'
})
export class FindingDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspectionsService = inject(InspectionsService);
  private mutationQueueService = inject(MutationQueueService);
  private draftService = inject(DraftService);
  private destroyRef = inject(DestroyRef);

  rawInspection = signal<Inspection | null>(null);
  inspection = computed(() => {
    const raw = this.rawInspection();
    if (!raw) return null;
    return this.inspectionsService.mergePendingMutations(raw);
  });
  
  finding = computed(() => {
    const insp = this.inspection();
    let fId = this.findingId();
    if (!insp || !fId || fId === 'new' || fId === 'summary') return null;

    // Resolve client-side temporary ID to server-generated ID if completed
    const completedTask = this.mutationQueueService.allTasks().find(t => 
      t.type === MutationType.CREATE_FINDING && 
      t.status === 'COMPLETED' && 
      (t.clientFindingId === fId || t.id === fId)
    ) as any;
    if (completedTask && completedTask.result?.id) {
      fId = completedTask.result.id.toString();
    }

    return insp.findings?.find(f => f.id?.toString() === fId?.toString()) || null;
  });

  isLoading = signal(true);

  inspectionId = signal<string | null>(null);
  findingId = signal<string | null>(null);
  activeSection = signal<string | null>(null);
  isFindingsDropdownOpen = signal<boolean>(false);
  
  activeSectionIndex = computed(() => {
    const section = this.activeSection();
    if (!section || section === 'summary') return -1;
    return this.sections().findIndex(s => s.name === section);
  });
  
  private metadataUpdate$ = new Subject<{key: string, value: string}>();
  
  debugSync = signal<boolean>(true); // DEBUG FLAG

  @ViewChild('workbench') workbench!: WorkbenchLayoutComponent;

  readonly iconMap: Record<string, any> = {
    Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft,
    Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert,
    BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning,
    Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send,
    Download, Loader2, CheckCircle2, Layers, Menu, PieChart, LayoutList
  };

    readonly icons = { ChevronLeft, LayoutGrid, Plus, Home, ChevronDown, CheckCircle2, FileText, Ban, CircleX, Info, Edit2, PieChart, AlertCircle, LayoutList };


  sections = computed(() => this.inspection()?.template_snapshot?.sections || []);

  currentSection = computed(() => {
    const sections = this.sections();
    const index = this.activeSectionIndex();
    if (index >= 0 && index < sections.length) {
      return sections[index];
    }
    return sections.find(s => s.name === this.activeSection()) || null;
  });

  currentSectionPresets = computed(() => {
    const section = this.currentSection();
    return section?.presets || [];
  });

  currentSectionLocationPresets = computed(() => {
    const section = this.currentSection();
    return section?.location_presets || [];
  });

  sectionFindings = computed(() => {
    const section = this.activeSection();
    const findings = this.inspection()?.findings || [];
    if (!section) return [];
    return findings.filter(f => f.section === section);
  });

  sectionCounts = computed(() => {
    const findings = this.inspection()?.findings || [];
    const counts: Record<string, number> = {};
    findings.forEach(f => {
      counts[f.section] = (counts[f.section] || 0) + 1;
    });
    return counts;
  });

  currentSectionStatus = computed<SectionStatus>(() => {
    const section = this.activeSection();
    const statuses = this.inspection()?.section_statuses || {};
    return section ? (statuses[section] || { status: 'inspected' }) : { status: 'inspected' };
  });

  totalFindings = computed(() => this.inspection()?.findings?.length || 0);

  canPreviewReport = computed(() => {
    const insp = this.inspection();
    return insp !== null && insp.status !== 'published';
  });

  ngOnInit() {
    // 1. Watch for Inspection/Finding changes
    this.route.paramMap.subscribe(params => {
      const inspId = params.get('id');
      const findingId = params.get('findingId');
      const prevInspId = this.inspectionId();
      const prevFindingId = this.findingId();

      // Only reload full data if the Inspection ID changed
      if (inspId && inspId !== prevInspId) {
        this.inspectionId.set(inspId);
        this.findingId.set(findingId);
        this.loadData();
      } else {
        this.findingId.set(findingId);
      }
    });

    // 2. Watch for Section changes
    this.route.queryParamMap.subscribe(queryParams => {
      const section = queryParams.get('section');
      
      // AUTO-REDIRECT: If we land in the workbench without a section or finding, 
      // default to the Report Summary instead of showing a blank div.
      const fId = this.findingId();
      if (!section && (!fId || fId === 'new')) {
        this.router.navigate(['/inspections', this.inspectionId(), 'findings', 'summary'], {
          queryParams: { section: 'summary' },
          replaceUrl: true
        });
        return;
      }

      // If we have a section, set it
      if (section) {
        this.activeSection.set(section);
      } else if (fId && fId !== 'new' && fId !== 'summary') {
        // If we have a finding ID but NO section, try to resolve it from the finding
        const found = this.finding();
        if (found) {
          this.activeSection.set(found.section);
        }
      }
    });

    // Listen for background task completions to swap temporary IDs
    this.mutationQueueService.taskCompleted$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((completion: TaskCompletion) => {
      if (completion.clientFindingId && completion.clientFindingId === this.findingId()) {
        const section = this.activeSection();
        if (section) {
          const oldDraftKey = `finding:${this.inspectionId()}:${section}:${completion.clientFindingId}`;
          const newDraftKey = `finding:${this.inspectionId()}:${section}:${completion.result.id}`;
          this.draftService.rename(oldDraftKey, newDraftKey);
        }

        // Swap ID in URL without reloading data
        this.router.navigate(['/inspections', this.inspectionId(), 'findings', completion.result.id], { 
          queryParams: { section: this.activeSection() },
          replaceUrl: true 
        });
      }
    });

    // BACKGROUND HYDRATION: Quietly refetch the true server state using switchMap.
    // We use forceNetworkOnly = true to skip the cached-first emission (which causes textbox resets).
    // switchMap automatically cancels any pending requests if a new completion fires in the meantime.
    this.mutationQueueService.taskCompleted$.pipe(
      switchMap(() => {
        const currentId = this.inspectionId();
        if (currentId) {
          return this.inspectionsService.getInspectionById(currentId, true).pipe(
            catchError(err => {
              console.warn('Background hydration failed:', err);
              return of(null);
            })
          );
        }
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((insp) => {
      if (insp) {
        this.rawInspection.set(insp);
      }
    });

    // Debounced Metadata Updates (Shortened to 500ms for responsiveness)
    this.metadataUpdate$.pipe(debounceTime(500)).subscribe(({key, value}) => {
      this.enqueueInspectionUpdate({ metadata_values: { [key]: value } });
    });
  }

  loadData() {
    const inspId = this.inspectionId();
    if (!inspId) return;

    this.isLoading.set(true);
    
    // Preserve optimistic findings that are currently syncing
    // (We no longer manually reset 'finding' as it is computed)

    this.inspectionsService.getInspectionById(inspId).subscribe({
      next: (insp) => {
        this.rawInspection.set(insp);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Removed manual sync methods as 'finding' is now computed

  goBack() {
    this.router.navigate(['/inspections', this.inspectionId()]);
  }

  onSaved(finding: Finding) {
    // We NO LONGER manually update the inspection signal.
    // The computed 'inspection' signal will automatically pick up the new 
    // mutation task from the queue and merge it into the UI.

    // Navigation will trigger syncFindingFromState which uses the computed inspection
    this.router.navigate(['/inspections', this.inspectionId(), 'findings', finding.id], {
      queryParams: { section: this.activeSection() }
    });
  }

  selectSection(sectionName: string, index: number = 0) {
    this.workbench.closeSidebar();

    if (sectionName === 'summary') {
      this.router.navigate(['/inspections', this.inspectionId(), 'findings', 'summary'], {
        queryParams: { section: 'summary' }
      });
      return;
    }

    const findings = this.inspection()?.findings || [];
    const sectionFindings = findings.filter(f => f.section === sectionName);

    if (sectionFindings.length > 0) {
      // If there's already data in this section, load the first finding instead of a blank 'new'
      this.router.navigate(['/inspections', this.inspectionId(), 'findings', sectionFindings[0].id], {
        queryParams: { section: sectionName }
      });
    } else {
      // Only go to 'new' if there truly is no data for this category
      this.router.navigate(['/inspections', this.inspectionId(), 'findings', 'new'], {
        queryParams: { section: sectionName }
      });
    }
  }

  editFinding(finding: Finding) {
    this.router.navigate(['/inspections', this.inspectionId(), 'findings', finding.id], {
      queryParams: { section: finding.section }
    });
  }

  onDeleteFinding(finding: Finding) {
    const inspectionId = this.inspectionId();
    if (!inspectionId) return;

    // 1. If it's a completely new, unsynced (or failed) finding, just remove it from the queue locally
    const pendingCreateTask = this.mutationQueueService.allTasks().find(t => 
       t.type === MutationType.CREATE_FINDING && 
       (t.clientFindingId === finding.id || t.findingId === finding.id || t.id === finding.id) &&
       (t.status === 'PENDING' || t.status === 'FAILED' || t.status === 'SYNCING')
    );

    if (pendingCreateTask) {
      this.mutationQueueService.cancelTask(pendingCreateTask.id);
      
      if (this.findingId() === finding.id) {
        this.findingId.set(null);
      }
      
      const isLastItem = this.sectionFindings().length <= 1;
      if (isLastItem) {
        this.isFindingsDropdownOpen.set(false);
      }
      return;
    }

    const isLastItem = this.sectionFindings().length <= 1;

    this.mutationQueueService.enqueue({
      type: MutationType.DELETE_FINDING,
      inspectionId,
      findingId: finding.id,
      payload: {}
    });

    // Deselect finding if it was the one we just deleted
    if (this.findingId() === finding.id) {
      this.findingId.set(null);
    }

    if (isLastItem) {
      this.isFindingsDropdownOpen.set(false);
    }
  }

  onFindingSelected(finding: Finding) {
    if (!finding) {
      this.findingId.set(null);
    } else {
      this.findingId.set(finding.id);
    }
    this.isFindingsDropdownOpen.set(false);
  }

  onAddFindingTriggered() {
    const section = this.activeSection();
    if (!section) return;

    const newId = crypto.randomUUID();

    this.mutationQueueService.enqueue({
      type: MutationType.CREATE_FINDING,
      inspectionId: this.inspectionId()!,
      clientFindingId: newId,
      payload: {
        section: section,
        severity: Severity.MAINTENANCE,
        description: 'New Finding',
        location: '',
        recommendation: ''
      }
    });
    
    // Auto-select the newly created finding
    this.findingId.set(newId);
    this.isFindingsDropdownOpen.set(false);
  }

  getIconForSection(iconKey: string | undefined): any {
    return this.iconMap[iconKey || 'Home'] || Home;
  }

  updateMetadataValue(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateMetadataValueDirect(key, input.value);
  }

  updateMetadataValueDirect(key: string, value: string): void {
    const insp = this.rawInspection();
    if (!insp) return;

    // Update rawInspection immediately so the UI binding reflects the changes instantly
    const updated = {
      ...insp,
      metadata_values: {
        ...(insp.metadata_values || {}),
        [key]: value
      }
    };
    this.rawInspection.set(updated);

    // Queue the change (debounced for network sync)
    this.metadataUpdate$.next({ key, value });
  }

  private enqueueInspectionUpdate(payload: any): void {
    const insp = this.inspection();
    if (!insp) return;

    if (this.debugSync()) console.log('[DEBUG SYNC] Enqueuing Update:', payload);

    this.mutationQueueService.enqueue({
      type: MutationType.UPDATE_INSPECTION,
      inspectionId: insp.id,
      payload
    });
  }

  updateSectionStatus(status: 'inspected' | 'not_inspected' | 'not_present'): void {
    const insp = this.inspection();
    const section = this.activeSection();
    if (!insp || !section) return;

    if (this.debugSync()) console.log(`[DEBUG SYNC] Optimistic Status [${section}]:`, status);

    const current = insp.section_statuses?.[section] || {};
    
    // Queue the change IMMEDIATELY
    this.enqueueInspectionUpdate({ 
      section_statuses: { [section]: { ...current, status } } 
    });
  }

    updateSectionReasonDirect(reason: string): void {
    const insp = this.inspection();
    const section = this.activeSection();
    if (!insp || !section) return;

    if (this.debugSync()) console.log(`[DEBUG SYNC] Optimistic Reason [${section}]:`, reason);

    const current = insp.section_statuses?.[section] || {};
    
    // Queue the change IMMEDIATELY
    this.enqueueInspectionUpdate({ 
      section_statuses: { [section]: { ...current, reason } } 
    });
  }
}

