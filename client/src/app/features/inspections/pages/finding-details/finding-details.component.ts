import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection, Finding, SectionStatus } from '../../../../core/models/inspection.interface';
import { WorkbenchLayoutComponent } from '../../../../shared/components/workbench-layout/workbench-layout.component';
import { FindingFormComponent } from '../../components/finding-form/finding-form.component';
import { FindingSwitcherComponent } from '../../components/finding-switcher/finding-switcher.component';
import { LucideAngularModule, Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu, ChevronLeft, LayoutGrid, CircleX, PieChart, Eye } from 'lucide-angular';

import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { SectionStatusToggleComponent } from '../../components/section-status-toggle/section-status-toggle';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { SelectInputComponent } from '../../../../shared/components/inputs/select-input/select-input.component';
import { SummaryDashboardComponent } from '../../components/summary-dashboard/summary-dashboard.component';
import { MutationQueueService, MutationType, TaskCompletion } from '../../../../core/services/mutation-queue.service';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-finding-details',
  standalone: true,
  imports: [CommonModule, WorkbenchLayoutComponent, FindingFormComponent, FindingSwitcherComponent, LucideAngularModule, BackButtonComponent, SectionStatusToggleComponent, TextInputComponent, SelectInputComponent, SummaryDashboardComponent],
  providers: [{ provide: 'lucideIcons', useValue: { Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu, ChevronLeft, LayoutGrid, CircleX, PieChart } }],
  templateUrl: './finding-details.component.html',
  styleUrl: './finding-details.component.scss'
})
export class FindingDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspectionsService = inject(InspectionsService);
  private mutationQueueService = inject(MutationQueueService);

  rawInspection = signal<Inspection | null>(null);
  inspection = computed(() => {
    const raw = this.rawInspection();
    if (!raw) return null;
    return this.inspectionsService.mergePendingMutations(raw);
  });
  
  finding = computed(() => {
    const insp = this.inspection();
    const fId = this.findingId();
    if (!insp || !fId || fId === 'new' || fId === 'summary') return null;
    return insp.findings?.find(f => f.id === fId) || null;
  });

  isLoading = signal(true);

  inspectionId = signal<string | null>(null);
  findingId = signal<string | null>(null);
  activeSection = signal<string | null>(null);
  activeSectionIndex = signal<number>(-1);
  
  private metadataUpdate$ = new Subject<{key: string, value: string}>();
  
  debugSync = signal<boolean>(true); // DEBUG FLAG

  @ViewChild('workbench') workbench!: WorkbenchLayoutComponent;

  readonly iconMap: Record<string, any> = {
    Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft,
    Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert,
    BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning,
    Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send,
    Download, Loader2, CheckCircle2, Layers, Menu, PieChart
  };

    readonly icons = { ChevronLeft, LayoutGrid, Plus, Home, ChevronDown, CheckCircle2, FileText, Ban, CircleX, Info, Edit2, PieChart, AlertCircle };


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
        const idx = queryParams.get('idx');
        if (idx !== null) {
          this.activeSectionIndex.set(Number(idx));
        } else {
          const sections = this.sections();
          const firstIdx = sections.findIndex(s => s.name === section);
          this.activeSectionIndex.set(firstIdx);
        }
      } else if (fId && fId !== 'new' && fId !== 'summary') {
        // If we have a finding ID but NO section, try to resolve it from the finding
        const found = this.finding();
        if (found) {
          this.activeSection.set(found.section);
        }
      }
    });

    // Listen for background task completions to swap temporary IDs
    this.mutationQueueService.taskCompleted$.subscribe((completion: TaskCompletion) => {
      if (completion.clientFindingId && completion.clientFindingId === this.findingId()) {
        // Swap ID in URL without reloading data
        this.router.navigate(['/inspections', this.inspectionId(), 'findings', completion.result.id], { 
          queryParams: { section: this.activeSection() },
          replaceUrl: true 
        });
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
    this.activeSectionIndex.set(index);

    if (sectionName === 'summary') {
      this.router.navigate(['/inspections', this.inspectionId(), 'findings', 'summary'], {
        queryParams: { section: 'summary', idx: -1 }
      });
      return;
    }

    const findings = this.inspection()?.findings || [];
    const sectionFindings = findings.filter(f => f.section === sectionName);

    if (sectionFindings.length > 0) {
      // If there's already data in this section, load the first finding instead of a blank 'new'
      this.router.navigate(['/inspections', this.inspectionId(), 'findings', sectionFindings[0].id], {
        queryParams: { section: sectionName, idx: index }
      });
    } else {
      // Only go to 'new' if there truly is no data for this category
      this.router.navigate(['/inspections', this.inspectionId(), 'findings', 'new'], {
        queryParams: { section: sectionName, idx: index }
      });
    }
  }

  editFinding(finding: Finding) {
    this.router.navigate(['/inspections', this.inspectionId(), 'findings', finding.id], {
      queryParams: { section: finding.section }
    });
  }

  startNewFinding() {
    this.router.navigate(['/inspections', this.inspectionId(), 'findings', 'new'], {
      queryParams: { section: this.activeSection() }
    });
  }

  onFindingSelected(finding: Finding | null) {
    if (finding) {
      this.editFinding(finding);
    } else {
      this.startNewFinding();
    }
  }

  getIconForSection(iconKey: string | undefined): any {
    return this.iconMap[iconKey || 'Home'] || Home;
  }

  updateMetadataValue(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateMetadataValueDirect(key, input.value);
  }

  updateMetadataValueDirect(key: string, value: string): void {
    const insp = this.inspection();
    if (!insp) return;

    // We only update the raw state if we want it to persist across navigation
    // but the computed 'inspection' signal handles the visual update via the queue

    // Queue the change
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

