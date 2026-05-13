import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { LucideAngularModule, AlertCircle, ArrowLeft, Layers } from 'lucide-angular';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';
import { TemplatesService } from '../../../templates/services/templates.service';
import { SelectInputComponent, SelectOption } from '../../../../shared/components/inputs/select-input/select-input.component';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';

@Component({
  selector: 'app-inspection-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    TextInputComponent,
    SelectInputComponent,
    LucideAngularModule,
    SkeletonComponent,
    BackButtonComponent
  ],
  templateUrl: './inspection-form.component.html',
  styleUrl: './inspection-form.component.scss',
  providers: [
    {
      provide: 'lucideIcons',
      useValue: { AlertCircle, ArrowLeft, Layers }
    }
  ],
})
export class InspectionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);
  private templatesService = inject(TemplatesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  isFetching = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  private inspectionId = signal<string | null>(null);
  private inspection = signal<Inspection | null>(null);

  isEditMode = computed(() => !!this.inspectionId());
  selectedTemplateName = computed(() => {
    const tid = this.inspectionForm.get('template_id')?.value;
    if (!tid) return 'Default Template';
    const opt = this.availableTemplates().find(o => o.value === tid);
    return opt ? opt.label : 'Custom Blueprint';
  });

  availableTemplates = signal<SelectOption[]>([]);

  readonly icons = { AlertCircle, ArrowLeft, Layers };

  inspectionForm: FormGroup = this.fb.group({
    address: ['', [Validators.required]],
    client_name: ['', [Validators.required]],
    client_email: ['', [Validators.email]],
    client_phone: [''],
    year_built: [new Date().getFullYear(), [Validators.required, Validators.min(1800), Validators.max(new Date().getFullYear())]],
    square_footage: [null, [Validators.min(1)]],
    template_id: [''],
    weather: ['', [Validators.maxLength(100)]],
    temperature: [null, [Validators.min(-100), Validators.max(150)]],
    occupancy: ['', [Validators.maxLength(100)]],
    attendees: ['', [Validators.maxLength(500)]],
    foundation_type: ['', [Validators.maxLength(200)]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.inspectionId.set(id);
      this.fetchInspection(id);
    }
    this.loadTemplates();
  }

  private fetchInspection(id: string): void {
    this.isFetching.set(true);
    this.errorMessage.set(null);
    this.inspectionsService.getInspectionById(id).subscribe({
      next: (data) => {
        this.inspection.set(data);
        this.inspectionForm.patchValue({
          address: data.address,
          client_name: data.client_name,
          client_email: data.client_email,
          client_phone: data.client_phone || '',
          year_built: data.year_built,
          square_footage: data.square_footage,
          weather: data.weather || '',
          temperature: data.temperature || '',
          occupancy: data.occupancy || '',
          attendees: data.attendees || '',
          foundation_type: data.foundation_type || '',
          template_id: data.template_id || '',
        });
        this.isFetching.set(false);
      },
      error: (err) => {
        console.error('Failed to load inspection for editing', err);
        this.errorMessage.set('Could not load inspection data. Please go back and try again.');
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
        if (opts.length > 0 && !this.isEditMode() && !this.inspectionForm.get('template_id')?.value) {
          this.inspectionForm.get('template_id')?.setValue(opts[0].value);
        }
      },
      error: (err) => console.error('Failed to load templates', err),
    });
  }

  goBack(): void {
    this.router.navigate(['/inspections']);
  }

  onSubmit(): void {
    if (this.inspectionForm.valid && !this.isLoading()) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const formValue = { ...this.inspectionForm.value };

      if (formValue.square_footage === '') {
        formValue.square_footage = null;
      } else if (formValue.square_footage !== null && formValue.square_footage !== undefined) {
        formValue.square_footage = Number(formValue.square_footage);
      }

      if (formValue.year_built) {
        formValue.year_built = Number(formValue.year_built);
      }

      if (formValue.temperature !== null && formValue.temperature !== undefined && formValue.temperature !== '') {
        formValue.temperature = Number(formValue.temperature);
      }

      const id = this.inspectionId();
      const request$ = id
        ? this.inspectionsService.updateInspection(id, formValue)
        : this.inspectionsService.createInspection(formValue);

      request$.subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/inspections']);
        },
        error: (err) => {
          console.error(`Failed to ${id ? 'update' : 'create'} inspection`, err);
          this.errorMessage.set(err.error?.message || 'An unexpected error occurred. Please try again.');
          this.isLoading.set(false);
          this.scrollToFirstError();
        },
      });
    } else {
      this.inspectionForm.markAllAsTouched();
      // Give Angular a moment to render the error classes before we scroll
      setTimeout(() => this.scrollToFirstError(), 100);
    }
  }

  private scrollToFirstError(): void {
    const firstInvalid = document.querySelector('.input-wrapper--error');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
