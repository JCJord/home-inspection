import { Component, OnInit, OnDestroy, signal, inject, computed, input, output, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { TemplatesService } from '../../services/templates.service';
import { Template, TemplateStructure, TemplateSection, TemplateField, TemplatePreset } from '../../models/template.interface';
import { LucideAngularModule, Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu } from 'lucide-angular';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { TextareaInputComponent } from '../../../../shared/components/inputs/textarea-input/textarea-input.component';
import { SelectInputComponent } from '../../../../shared/components/inputs/select-input/select-input.component';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { ConfirmPillComponent } from '../../../../shared/components/confirm-pill/confirm-pill.component';

@Component({
  selector: 'app-template-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ButtonComponent, TextInputComponent, TextareaInputComponent, SelectInputComponent, BackButtonComponent, ConfirmPillComponent],
  providers: [{ provide: 'lucideIcons', useValue: { Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft, Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert, BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning, Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send, Download, Loader2, CheckCircle2, Layers, Menu } }],
  templateUrl: './template-editor.component.html',
  styleUrl: './template-editor.component.scss'
})
export class TemplateEditorComponent implements OnInit, OnDestroy {
  templateId = input<string | null>(null);
  close = output<void>();

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private templatesService = inject(TemplatesService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  template = signal<Template | null>(null);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  selectedSectionIndex = signal<number>(0);
  availableIcons = signal<string[]>([]);
  showIconPicker = signal<boolean>(false);
  isSidebarOpen = signal<boolean>(false);
  deletingIndex = signal<number | null>(null);
  deletingFieldIndex = signal<number | null>(null);
  deletingPresetIndex = signal<number | null>(null);
  addingIndex = signal<number | null>(null);
  addingFieldIndex = signal<number | null>(null);
  addingPresetIndex = signal<number | null>(null);

  confirmingDeleteSectionIndex = signal<number | null>(null);
  confirmingDeleteFieldIndex = signal<number | null>(null);
  confirmingDeletePresetIndex = signal<number | null>(null);

  @ViewChild('sidebarContent') sidebarContent!: ElementRef;

  severityOptions = ['Minor', 'Major', 'Safety', 'Maintenance'];
  form!: FormGroup;
  private destroy$ = new Subject<void>();

  readonly iconMap: Record<string, any> = {
    Home, ChevronUp, ChevronDown, Hammer, Zap, Droplets, Wind, Flame, Box, Grid, Monitor, Car, Shield, Search, Info, AlertTriangle, Copy, Edit2, Trash2, Plus, Save, Lock, Unlock, ArrowLeft,
    Wrench, Thermometer, Lightbulb, Paintbrush, Sun, Key, Eye, Power, FileCheck, HardHat, Construction, Ruler, ShieldCheck, ShieldAlert,
    BrickWall, Trees, Fan, Sparkles, Wifi, WifiOff, Trash, Settings, Check, X, Users, FileText, Image, Cloud, CloudRain, CloudLightning,
    Snowflake, Umbrella, Compass, MapPin, Clock, Calendar, Activity, Scissors, Heart, AlertCircle, HelpCircle, Ban, LockOpen, Send,
    Download, Loader2, CheckCircle2, Layers, Menu
  };

  isSystemDefault = computed(() => this.template()?.inspector_id === null);

  get sectionsFormArray(): FormArray {
    return this.form?.get('structure.sections') as FormArray;
  }

  get currentSection(): FormGroup | null {
    if (!this.sectionsFormArray || this.sectionsFormArray.length === 0) return null;
    return this.sectionsFormArray.at(this.selectedSectionIndex()) as FormGroup;
  }

  ngOnInit(): void {
    this.initEmptyForm();
    this.loadIcons();
    const idFromRoute = this.route.snapshot.paramMap.get('id');
    const id = this.templateId() || idFromRoute;

    if (id) {
      this.loadTemplate(id);
    } else {
      this.router.navigate(['/templates']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initEmptyForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      structure: this.fb.group({
        sections: this.fb.array([])
      })
    });
  }

  loadTemplate(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.cdr.detectChanges();

    this.templatesService.getTemplate(id).subscribe({
      next: (data) => {
        this.template.set(data);
        this.createForm(data);
        this.isLoading.set(false);
        if (data.structure?.sections?.length) {
          this.selectedSectionIndex.set(0);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load template', err);
        this.errorMessage.set('Could not load template workbench.');
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  createForm(data: Template): void {
    this.form = this.fb.group({
      name: [data.name, Validators.required],
      structure: this.fb.group({
        sections: this.fb.array(
          (data.structure?.sections || []).map(sec => this.fb.group({
            name: [sec.name, Validators.required],
            icon_key: [sec.icon_key || 'Home'],
            fields: this.fb.array(
              (sec.fields || []).map(f => this.createFieldGroup(f.label, f.key, f.type))
            ),
            presets: this.fb.array(
              (sec.presets || []).map(p => this.fb.group({
                title: [p.title, [Validators.required, Validators.maxLength(200)]],
                severity: [p.severity || 'Minor', Validators.required],
                description: [p.description || '', [Validators.maxLength(2200)]]
              }))
            )
          }))
        )
      })
    });

    this.form.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });

    this.form.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$)
    ).subscribe(val => {
      this.autoSave(val);
    });
  }

  createFieldGroup(label: string, key: string, type: string = 'text'): FormGroup {
    const group = this.fb.group({
      label: [label, Validators.required],
      key: [key, Validators.required],
      type: [type]
    });

    group.get('label')?.valueChanges.pipe(
      debounceTime(100),
      takeUntil(this.destroy$)
    ).subscribe(val => {
      if (!this.isSystemDefault()) {
        group.get('key')?.setValue(this.slugify(val || ''), { emitEvent: false });
      }
    });

    return group;
  }

  autoSave(val: any): void {
    const currentTemplate = this.template();
    if (!currentTemplate || this.isSystemDefault()) return;

    this.templatesService.updateTemplate(currentTemplate.id, val.structure).subscribe({
      next: (updated) => {
        const nextTemplate = { ...currentTemplate, name: val.name, structure: val.structure };
        this.template.set(nextTemplate);
      },
      error: (err) => console.error('Auto-save failed', err)
    });
  }

  loadIcons(): void {
    this.templatesService.getIcons().subscribe({
      next: (icons) => {
        this.availableIcons.set(icons);
      },
      error: (err) => console.error('Failed to load icons', err)
    });
  }

  goBack(): void {
    if (this.templateId()) {
      this.close.emit();
    } else {
      this.router.navigate(['/templates']);
    }
  }

  selectSection(index: number): void {
    this.selectedSectionIndex.set(index);
    this.showIconPicker.set(false);
    this.isSidebarOpen.set(false);
  }

  toggleSidebar(): void {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  addSection(): void {
    if (this.isSystemDefault()) return;

    const newSec = this.fb.group({
      name: ['New Section', Validators.required],
      icon_key: ['Home'],
      fields: this.fb.array([
        this.createFieldGroup('Material / Type', 'new_section_material'),
        this.createFieldGroup('Inspection Method', 'new_section_method')
      ]),
      presets: this.fb.array([
        this.fb.group({ title: ['Common Issue'], description: ['Observed standard wear and tear.'], severity: ['Minor'] })
      ])
    });

    this.sectionsFormArray.insert(0, newSec);
    this.selectedSectionIndex.set(0);
    this.addingIndex.set(0);

    // Reset adding state after animation
    setTimeout(() => this.addingIndex.set(null), 1000);

    // Scroll to top after view updates
    setTimeout(() => {
      if (this.sidebarContent) {
        this.sidebarContent.nativeElement.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }, 100);
  }

  removeSection(index: number, event: Event): void {
    event.stopPropagation();
    if (this.isSystemDefault()) return;
    this.confirmingDeleteSectionIndex.set(index);
  }

  cancelDeleteSection(): void {
    this.confirmingDeleteSectionIndex.set(null);
  }

  confirmRemoveSection(index: number): void {
    if (this.isSystemDefault()) return;

    // Set the deleting index to trigger CSS animation
    this.deletingIndex.set(index);
    this.confirmingDeleteSectionIndex.set(null);

    // Wait for animation to finish (250ms)
    setTimeout(() => {
      this.sectionsFormArray.removeAt(index);
      this.deletingIndex.set(null);

      if (this.selectedSectionIndex() >= this.sectionsFormArray.length) {
        this.selectedSectionIndex.set(Math.max(0, this.sectionsFormArray.length - 1));
      }
    }, 250);
  }

  toggleIconPicker(): void {
    if (this.isSystemDefault()) return;
    this.showIconPicker.set(!this.showIconPicker());
  }

  selectIcon(iconKey: string): void {
    if (this.isSystemDefault()) return;
    if (this.currentSection) {
      this.currentSection.get('icon_key')?.setValue(iconKey);
      this.showIconPicker.set(false);
    }
  }

  getFieldsFormArray(sectionIndex: number): FormArray {
    return this.sectionsFormArray.at(sectionIndex).get('fields') as FormArray;
  }

  getPresetsFormArray(sectionIndex: number): FormArray {
    return this.sectionsFormArray.at(sectionIndex).get('presets') as FormArray;
  }

  addField(): void {
    if (this.isSystemDefault()) return;
    const fields = this.getFieldsFormArray(this.selectedSectionIndex());
    fields.push(this.createFieldGroup('New Field', 'new_field'));

    this.addingFieldIndex.set(fields.length - 1);
    setTimeout(() => this.addingFieldIndex.set(null), 1000);
  }

  removeField(index: number): void {
    if (this.isSystemDefault()) return;
    this.confirmingDeleteFieldIndex.set(index);
  }

  cancelDeleteField(): void {
    this.confirmingDeleteFieldIndex.set(null);
  }

  confirmRemoveField(index: number): void {
    if (this.isSystemDefault()) return;
    this.deletingFieldIndex.set(index);
    this.confirmingDeleteFieldIndex.set(null);

    setTimeout(() => {
      this.getFieldsFormArray(this.selectedSectionIndex()).removeAt(index);
      this.deletingFieldIndex.set(null);
    }, 250);
  }

  slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_+|_\+$)/g, '');
  }

  addPreset(): void {
    if (this.isSystemDefault()) return;
    const presets = this.getPresetsFormArray(this.selectedSectionIndex());
    presets.push(this.fb.group({
      title: ['New Finding Preset', [Validators.required, Validators.maxLength(200)]],
      description: ['Provide standard defect description.', [Validators.required, Validators.maxLength(2200)]],
      severity: ['Minor', Validators.required]
    }));

    this.addingPresetIndex.set(presets.length - 1);
    setTimeout(() => this.addingPresetIndex.set(null), 1000);
  }

  removePreset(index: number): void {
    if (this.isSystemDefault()) return;
    this.confirmingDeletePresetIndex.set(index);
  }

  cancelDeletePreset(): void {
    this.confirmingDeletePresetIndex.set(null);
  }

  confirmRemovePreset(index: number): void {
    if (this.isSystemDefault()) return;
    this.deletingPresetIndex.set(index);
    this.confirmingDeletePresetIndex.set(null);

    setTimeout(() => {
      this.getPresetsFormArray(this.selectedSectionIndex()).removeAt(index);
      this.deletingPresetIndex.set(null);
    }, 250);
  }

  cloneTemplate(): void {
    const currentTemplate = this.template();
    if (!currentTemplate) return;

    const newName = window.prompt('Enter a name for the cloned template:', `Copy of ${currentTemplate.name}`);
    if (newName && newName.trim()) {
      this.templatesService.cloneTemplate(currentTemplate.id, newName.trim()).subscribe({
        next: (cloned) => {
          this.router.navigate(['/templates', cloned.id]);
        },
        error: (err) => {
          console.error('Failed to clone blueprint', err);
          alert('Failed to clone blueprint.');
        }
      });
    }
  }

}

