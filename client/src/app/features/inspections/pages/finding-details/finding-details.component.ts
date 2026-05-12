import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection, Finding, SectionStatus } from '../../../../core/models/inspection.interface';
import { WorkbenchLayoutComponent } from '../../../../shared/components/workbench-layout/workbench-layout.component';
import { FindingFormComponent } from '../../components/finding-form/finding-form.component';
import { FindingSwitcherComponent } from '../../components/finding-switcher/finding-switcher.component';
import { LucideAngularModule, Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu, ChevronLeft, LayoutGrid, CircleX, PieChart } from 'lucide-angular';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { SectionStatusToggleComponent } from '../../components/section-status-toggle/section-status-toggle';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { SummaryDashboardComponent } from '../../components/summary-dashboard/summary-dashboard.component';

@Component({
  selector: 'app-finding-details',
  standalone: true,
  imports: [CommonModule, WorkbenchLayoutComponent, FindingFormComponent, FindingSwitcherComponent, LucideAngularModule, BackButtonComponent, SectionStatusToggleComponent, TextInputComponent, SummaryDashboardComponent],
  providers: [{ provide: 'lucideIcons', useValue: { Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu, ChevronLeft, LayoutGrid, CircleX, PieChart } }],
  templateUrl: './finding-details.component.html',
  styleUrl: './finding-details.component.scss'
})
export class FindingDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inspectionsService = inject(InspectionsService);

  inspection = signal<Inspection | null>(null);
  finding = signal<Finding | null>(null);
  isLoading = signal(true);

  inspectionId = signal<string | null>(null);
  findingId = signal<string | null>(null);
  selectedSection = signal<string | null>(null);

  @ViewChild('workbench') workbench!: WorkbenchLayoutComponent;

  readonly iconMap: Record<string, any> = {
    Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft,
    Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert,
    BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning,
    Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send,
    Download, Loader2, CheckCircle2, Layers, Menu, PieChart
  };

  readonly icons = { ChevronLeft, LayoutGrid, Plus, Home, ChevronDown, CheckCircle2, FileText, Ban, CircleX, Info, Edit2, PieChart };

  sections = computed(() => this.inspection()?.template_snapshot?.sections || []);

  currentSection = computed(() => {
    const sections = this.inspection()?.template_snapshot?.sections || [];
    return sections.find(s => s.name === this.selectedSection()) || null;
  });

  currentSectionPresets = computed(() => {
    const section = this.currentSection();
    return section?.presets || [];
  });

  sectionFindings = computed(() => {
    const section = this.selectedSection();
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
    const section = this.selectedSection();
    const statuses = this.inspection()?.section_statuses || {};
    return section ? (statuses[section] || { status: 'inspected' }) : { status: 'inspected' };
  });

  totalFindings = computed(() => this.inspection()?.findings?.length || 0);

  ngOnInit() {
    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ]).subscribe(([params, queryParams]) => {
      const prevInspId = this.inspectionId();
      const prevFindingId = this.findingId();

      const inspId = params.get('id');
      const findingId = params.get('findingId');
      const section = queryParams.get('section');

      this.inspectionId.set(inspId);
      this.findingId.set(findingId);

      // Update section from query params (always update to keep in sync with URL)
      this.selectedSection.set(section);

      // Only reload data if IDs changed or if inspection hasn't been loaded yet
      if (inspId !== prevInspId || findingId !== prevFindingId || !this.inspection()) {
        this.loadData();
      }
    });
  }

  loadData() {
    const inspId = this.inspectionId();
    if (!inspId) return;

    this.isLoading.set(true);
    // Reset finding state to avoid showing old data if component is reused
    this.finding.set(null);

    this.inspectionsService.getInspectionById(inspId).subscribe({
      next: (insp) => {
        this.inspection.set(insp);

        const fId = this.findingId();
        if (fId && fId !== 'new' && fId !== 'summary') {
          // Optimization: try to find in the already loaded inspection
          const found = insp.findings?.find(f => f.id === fId);
          if (found) {
            this.finding.set(found);
            this.selectedSection.set(found.section);
            this.isLoading.set(false);
          } else {
            // Fallback to direct fetch if not in the list for some reason
            this.loadFinding(inspId, fId);
          }
        } else {
          this.isLoading.set(false);
          // If no section selected, use the first one from template or 'summary'
          if (!this.selectedSection() && insp.template_snapshot?.sections?.length) {
            this.selectedSection.set(insp.template_snapshot.sections[0].name);
          }
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadFinding(inspId: string, findingId: string) {
    this.inspectionsService.getFinding(inspId, findingId).subscribe({
      next: (finding) => {
        this.finding.set(finding);
        this.selectedSection.set(finding.section);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  goBack() {
    this.router.navigate(['/inspections', this.inspectionId()]);
  }

  onSaved(finding: Finding) {
    this.goBack();
  }

  selectSection(sectionName: string) {
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

  startNewFinding() {
    this.router.navigate(['/inspections', this.inspectionId(), 'findings', 'new'], {
      queryParams: { section: this.selectedSection() }
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

    const currentMetadata = insp.metadata_values || {};
    const updatedMetadata = { ...currentMetadata, [key]: value };

    this.inspectionsService.updateInspection(insp.id, { metadata_values: updatedMetadata }).subscribe({
      next: (updated) => {
        this.inspection.set(updated);
      },
      error: (err) => console.error('Failed to update metadata', err)
    });
  }

  updateSectionStatus(status: 'inspected' | 'not_inspected' | 'not_present'): void {
    const insp = this.inspection();
    const section = this.selectedSection();
    if (!insp || !section) return;

    const currentStatuses = insp.section_statuses || {};
    const updatedStatuses = { 
      ...currentStatuses, 
      [section]: { ...currentStatuses[section], status } 
    };

    this.inspectionsService.updateInspection(insp.id, { section_statuses: updatedStatuses }).subscribe({
      next: (updated) => {
        this.inspection.set(updated);
      },
      error: (err) => console.error('Failed to update section status', err)
    });
  }

  updateSectionReason(event: Event): void {
    const input = event.target as HTMLTextAreaElement | HTMLInputElement;
    this.updateSectionReasonDirect(input.value);
  }

  updateSectionReasonDirect(reason: string): void {
    const insp = this.inspection();
    const section = this.selectedSection();
    if (!insp || !section) return;

    const currentStatuses = insp.section_statuses || {};
    const updatedStatuses = { 
      ...currentStatuses, 
      [section]: { ...currentStatuses[section], reason } 
    };

    this.inspectionsService.updateInspection(insp.id, { section_statuses: updatedStatuses }).subscribe({
      next: (updated) => {
        this.inspection.set(updated);
      },
      error: (err) => console.error('Failed to update section reason', err)
    });
  }
}
