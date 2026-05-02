import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection, Finding, TemplateSection } from '../../../../core/models/inspection.interface';
import { WorkbenchLayoutComponent } from '../../../../shared/components/workbench-layout/workbench-layout.component';
import { FindingFormComponent } from '../../components/finding-form/finding-form.component';
import { FindingCardComponent } from '../../components/finding-card/finding-card.component';
import { LucideAngularModule, Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu, ChevronLeft, LayoutGrid } from 'lucide-angular';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-finding-details',
  standalone: true,
  imports: [CommonModule, WorkbenchLayoutComponent, FindingFormComponent, FindingCardComponent, LucideAngularModule, BackButtonComponent, ButtonComponent],
  providers: [{ provide: 'lucideIcons', useValue: { Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu, ChevronLeft, LayoutGrid } }],
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
    Download, Loader2, CheckCircle2, Layers, Menu
  };

  readonly icons = { ChevronLeft, LayoutGrid, Plus, Home, ChevronDown, CheckCircle2, FileText };

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

  ngOnInit() {
    import('rxjs').then(({ combineLatest }) => {
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
        
        if (section) {
          this.selectedSection.set(section);
        }

        // Only reload data if IDs changed or if inspection hasn't been loaded yet
        if (inspId !== prevInspId || findingId !== prevFindingId || !this.inspection()) {
          this.loadData();
        }
      });
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
        if (fId && fId !== 'new') {
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
           // If no section selected, use the first one from template
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
    const findings = this.inspection()?.findings || [];
    const sectionFindings = findings.filter(f => f.section === sectionName);
    
    this.workbench.closeSidebar();

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

  getIconForSection(iconKey: string | undefined): any {
    return this.iconMap[iconKey || 'Home'] || Home;
  }

  updateMetadataValue(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const insp = this.inspection();
    if (!insp) return;

    const updatedMetadata = { ...insp.metadata_values, [key]: value };
    
    this.inspectionsService.updateInspection(insp.id, { metadata_values: updatedMetadata }).subscribe({
      next: (updated) => {
        this.inspection.set(updated);
      },
      error: (err) => {
        console.error('Failed to update metadata', err);
      }
    });
  }
}
