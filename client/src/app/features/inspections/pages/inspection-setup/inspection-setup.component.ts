import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { SelectInputComponent, SelectOption } from '../../../../shared/components/inputs/select-input/select-input.component';
import { ToggleSwitchComponent } from '../../../../shared/components/inputs/toggle-switch/toggle-switch.component';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { InspectorsService } from '../../../../core/services/inspectors.service';
import { Inspection } from '../../../../core/models/inspection.interface';
import { TemplatesService } from '../../../templates/services/templates.service';
import {
  LucideAngularModule,
  AlertCircle,
  ArrowLeft,
  Layers,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from 'lucide-angular';

@Component({
  selector: 'app-inspection-setup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    TextInputComponent,
    SelectInputComponent,
    ToggleSwitchComponent,
    BackButtonComponent,
    SkeletonComponent,
    LucideAngularModule,
  ],
  templateUrl: './inspection-setup.component.html',
  styleUrl: './inspection-setup.component.scss',
  providers: [
    {
      provide: 'lucideIcons',
      useValue: { AlertCircle, ArrowLeft, Layers, Calendar, Clock, ChevronDown, ChevronUp, DollarSign },
    },
  ],
})
export class InspectionSetupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);
  private inspectorsService = inject(InspectorsService);
  private templatesService = inject(TemplatesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  isFetching = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  private inspectionId = signal<string | null>(null);
  private inspection = signal<Inspection | null>(null);

  isEditMode = computed(() => !!this.inspectionId());
  inspectionStatus = computed(() => this.inspection()?.status);
  availableTemplates = signal<SelectOption[]>([]);

  readonly icons = { AlertCircle, ArrowLeft, Layers, Calendar, Clock, ChevronDown, ChevronUp, DollarSign };

  setupForm: FormGroup = this.fb.group({
    address: ['', [Validators.required]],
    client_name: ['', [Validators.required, Validators.maxLength(100)]],
    client_email: ['', [Validators.email]],
    client_phone: [''],
    template_id: [''],
    
    // Scheduled Date is fully optional. If provided -> 'scheduled'. If empty -> 'in_progress' starts now.
    scheduled_date: [''],
    agreed_price: [null, [Validators.min(0), Validators.max(99999999.99)]],
    send_email: [true],

    // Optional property characteristics
    year_built: [new Date().getFullYear(), [Validators.min(1800), Validators.max(new Date().getFullYear())]],
    square_footage: [null, [Validators.min(1)]],
    weather: ['', [Validators.maxLength(100)]],
    temperature: [null, [Validators.min(-100), Validators.max(150)]],
    occupancy: ['', [Validators.maxLength(100)]],
    attendees: ['', [Validators.maxLength(500)]],
    foundation_type: ['', [Validators.maxLength(200)]],
  });

  selectedTemplateName = computed(() => {
    const tid = this.setupForm.get('template_id')?.value;
    if (!tid) return 'Default Template';
    const opt = this.availableTemplates().find(o => o.value === tid);
    if (opt) return opt.label;
    return this.inspection()?.template?.name || 'Custom Blueprint';
  });

  ngOnInit(): void {
    // 1. Check for edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.inspectionId.set(id);
      this.fetchInspection(id);
    } else {
      this.loadInspectorDefaults();
    }

    // 2. Load templates
    this.loadTemplates();
  }

  private fetchInspection(id: string): void {
    this.isFetching.set(true);
    this.errorMessage.set(null);
    this.inspectionsService.getInspectionById(id).subscribe({
      next: (data) => {
        this.inspection.set(data);

        // Format datetime string for picker if scheduled date exists
        let formattedDate = '';
        if (data.scheduled_date) {
          const date = new Date(data.scheduled_date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        this.setupForm.patchValue({
          address: data.address,
          client_name: data.client_name,
          client_email: data.client_email || '',
          client_phone: data.client_phone || '',
          template_id: data.template_id || '',
          scheduled_date: formattedDate,
          agreed_price: data.agreed_price,
          send_email: true,
          year_built: data.year_built || new Date().getFullYear(),
          square_footage: data.square_footage,
          weather: data.weather || '',
          temperature: data.temperature,
          occupancy: data.occupancy || '',
          attendees: data.attendees || '',
          foundation_type: data.foundation_type || '',
        });
        this.isFetching.set(false);
      },
      error: (err) => {
        console.error('Failed to load inspection', err);
        this.errorMessage.set('Could not load inspection data.');
        this.isFetching.set(false);
      },
    });
  }

  private loadTemplates(): void {
    this.templatesService.getTemplates().subscribe({
      next: (templates) => {
        const opts = templates.map(t => ({
          value: t.id,
          label: t.name,
        }));
        this.availableTemplates.set(opts);
        if (opts.length > 0 && !this.isEditMode() && !this.setupForm.get('template_id')?.value) {
          this.setupForm.get('template_id')?.setValue(opts[0].value);
        }
      },
    });
  }

  private loadInspectorDefaults(): void {
    this.inspectorsService.getProfile().subscribe({
      next: (profile) => {
        if ((profile as any).preferred_template_id) {
          this.setupForm.patchValue({
            template_id: (profile as any).preferred_template_id
          });
        }
      },
    });
  }

  goBack(): void {
    // If we have a date scheduled, go back to schedule calendar; otherwise go back to inspections workbench
    if (this.setupForm.get('scheduled_date')?.value || this.inspection()?.scheduled_date) {
      this.router.navigate(['/schedule']);
    } else {
      this.router.navigate(['/inspections']);
    }
  }

  onSubmit(): void {
    if (this.setupForm.invalid) {
      this.setupForm.markAllAsTouched();
      setTimeout(() => this.scrollToFirstError(), 100);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formData = { ...this.setupForm.value };

    // Format datetime correctly or nullify if empty
    if (formData.scheduled_date) {
      formData.scheduled_date = new Date(formData.scheduled_date).toISOString();
    } else {
      formData.scheduled_date = null;
    }

    if (formData.agreed_price === '' || formData.agreed_price === null || formData.agreed_price === undefined) {
      formData.agreed_price = null;
    } else {
      formData.agreed_price = Number(formData.agreed_price);
    }

    if (formData.year_built) {
      formData.year_built = Number(formData.year_built);
    } else {
      formData.year_built = null;
    }

    if (formData.square_footage === '' || formData.square_footage === null || formData.square_footage === undefined) {
      formData.square_footage = null;
    } else {
      formData.square_footage = Number(formData.square_footage);
    }

    if (formData.temperature === '' || formData.temperature === null || formData.temperature === undefined) {
      formData.temperature = null;
    } else {
      formData.temperature = Number(formData.temperature);
    }

    formData.client_email = formData.client_email || null;
    formData.client_phone = formData.client_phone || null;
    formData.template_id = formData.template_id || undefined;

    const id = this.inspectionId();
    const request$ = id
      ? this.inspectionsService.updateInspection(id, formData)
      : this.inspectionsService.createInspection(formData);

    request$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.goBack();
      },
      error: (err) => {
        console.error('Failed to save inspection', err);
        this.errorMessage.set(err.error?.message || 'An unexpected error occurred. Please try again.');
        this.isLoading.set(false);
        this.scrollToFirstError();
      },
    });
  }

  private scrollToFirstError(): void {
    const firstInvalid = document.querySelector('.input-wrapper--error, .border-error\\/30');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
