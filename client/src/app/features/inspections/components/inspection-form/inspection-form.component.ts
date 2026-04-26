import { Component, inject, signal, input, computed, effect, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { LucideAngularModule, ArrowLeft, AlertCircle } from 'lucide-angular';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';

import { TemplatesService } from '../../../templates/services/templates.service';
import { SelectInputComponent, SelectOption } from '../../../../shared/components/inputs/select-input/select-input.component';

@Component({
  selector: 'app-inspection-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TextInputComponent, SelectInputComponent, LucideAngularModule],
  templateUrl: './inspection-form.component.html',
  styleUrl: './inspection-form.component.scss',
})
export class InspectionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);
  private templatesService = inject(TemplatesService);

  inspection = input<Inspection | null>(null);

  close = output<void>();
  saved = output<Inspection>();

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  isEditMode = computed(() => !!this.inspection());

  availableTemplates = signal<SelectOption[]>([]);

  readonly icons = { ArrowLeft, AlertCircle };

  inspectionForm: FormGroup = this.fb.group({
    address: ['', [Validators.required]],
    client_name: ['', [Validators.required]],
    client_email: ['', [Validators.required, Validators.email]],
    year_built: [new Date().getFullYear(), [Validators.required, Validators.min(1800), Validators.max(new Date().getFullYear())]],
    square_footage: [null, [Validators.min(1)]],
    template_id: [''],
    weather: ['', [Validators.maxLength(100)]],
    temperature: ['', [Validators.maxLength(50)]],
    occupancy: ['', [Validators.maxLength(100)]],
    attendees: ['', [Validators.maxLength(500)]],
    foundation_type: ['', [Validators.maxLength(200)]],
  });

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.templatesService.getTemplates().subscribe({
      next: (templates) => {
        const opts = templates.map(t => ({
          value: t.id,
          label: t.name
        }));
        this.availableTemplates.set(opts);
        if (opts.length > 0 && !this.isEditMode() && !this.inspectionForm.get('template_id')?.value) {
          this.inspectionForm.get('template_id')?.setValue(opts[0].value);
        }
      },
      error: (err) => console.error('Failed to load templates', err)
    });
  }

  constructor() {
    effect(() => {
      const data = this.inspection();
      if (data) {
        this.inspectionForm.patchValue({
          address: data.address,
          client_name: data.client_name,
          client_email: data.client_email,
          year_built: data.year_built,
          square_footage: data.square_footage,
          weather: data.weather || '',
          temperature: data.temperature || '',
          occupancy: data.occupancy || '',
          attendees: data.attendees || '',
          foundation_type: data.foundation_type || '',
          template_id: data.template_id || ''
        });
      } else {
        this.inspectionForm.reset({
          year_built: new Date().getFullYear()
        });
      }
    });
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

      const request$ = this.isEditMode()
        ? this.inspectionsService.updateInspection(this.inspection()!.id, formValue)
        : this.inspectionsService.createInspection(formValue);

      request$.subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.saved.emit(response);
          if (!this.isEditMode()) {
            this.inspectionForm.reset({
              year_built: new Date().getFullYear()
            });
          }
        },
        error: (err) => {
          console.error(`Failed to ${this.isEditMode() ? 'update' : 'create'} inspection`, err);
          this.errorMessage.set(err.error?.message || 'An unexpected error occurred. Please try again.');
          this.isLoading.set(false);
        }
      });
    } else {
      this.inspectionForm.markAllAsTouched();
    }
  }
}
