import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection, Finding, TemplateSection } from '../../../../core/models/inspection.interface';
import { WorkbenchLayoutComponent } from '../../../../shared/components/workbench-layout/workbench-layout.component';
import { FindingFormComponent } from '../../components/finding-form/finding-form.component';
import { LucideAngularModule, Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu, ChevronLeft, LayoutGrid } from 'lucide-angular';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';

@Component({
  selector: 'app-finding-details',
  standalone: true,
  imports: [CommonModule, WorkbenchLayoutComponent, FindingFormComponent, LucideAngularModule, BackButtonComponent],
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

  readonly icons = { ChevronLeft, LayoutGrid, Plus, Home, ChevronDown, CheckCircle2 };

  sections = computed(() => this.inspection()?.template_snapshot?.sections || []);
  
  currentSection = computed(() => {
    const sections = this.inspection()?.template_snapshot?.sections || [];
    return sections.find(s => s.name === this.selectedSection()) || null;
  });

  currentSectionPresets = computed(() => {
    const section = this.currentSection();
    return section?.presets || [];
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.inspectionId.set(params.get('id'));
      this.findingId.set(params.get('findingId'));
      
      this.loadData();
    });

    this.route.queryParamMap.subscribe(params => {
      const qSection = params.get('section');
      if (qSection) {
        this.selectedSection.set(qSection);
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
           // If no section selected from query, use the first one
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
    this.selectedSection.set(sectionName);
    this.workbench.closeSidebar();
    
    // If we were editing a finding, switch to "new finding" mode for the new section
    if (this.findingId()) {
        this.router.navigate(['/inspections', this.inspectionId(), 'findings', 'new'], {
            queryParams: { section: sectionName }
        });
    } else {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { section: sectionName },
            queryParamsHandling: 'merge'
        });
    }
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
