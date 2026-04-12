import { Component, inject, signal, input, computed, effect, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { LucideAngularModule, ArrowLeft, AlertCircle } from 'lucide-angular';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';

@Component({
  selector: 'app-inspection-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TextInputComponent, LucideAngularModule],
  templateUrl: './inspection-form.component.html',
  styleUrl: './inspection-form.component.scss',
})
export class InspectionFormComponent {
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);

  inspection = input<Inspection | null>(null);

  close = output<void>();
  saved = output<Inspection>();

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  isEditMode = computed(() => !!this.inspection());
  
  readonly icons = { ArrowLeft, AlertCircle };

  inspectionForm: FormGroup = this.fb.group({
    address: ['', [Validators.required]],
    client_name: ['', [Validators.required]],
    client_email: ['', [Validators.required, Validators.email]],
    year_built: [new Date().getFullYear(), [Validators.required, Validators.min(1800), Validators.max(new Date().getFullYear())]],
    square_footage: [null, [Validators.min(1)]],
  });

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

      const request$ = this.isEditMode()
        ? this.inspectionsService.updateInspection(this.inspection()!.id, this.inspectionForm.value)
        : this.inspectionsService.createInspection(this.inspectionForm.value);

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
