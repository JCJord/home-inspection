import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { LucideAngularModule, X, AlertCircle } from 'lucide-angular';
import { InspectionsService } from '../../../../core/services/inspections.service';

@Component({
  selector: 'app-create-inspection',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TextInputComponent, LucideAngularModule],
  templateUrl: './create-inspection.component.html',
  styleUrl: './create-inspection.component.scss',
})
export class CreateInspectionComponent {
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<any>();

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  readonly icons = { X, AlertCircle };

  inspectionForm: FormGroup = this.fb.group({
    address: ['', [Validators.required]],
    client_name: ['', [Validators.required]],
    client_email: ['', [Validators.required, Validators.email]],
    year_built: [new Date().getFullYear(), [Validators.required, Validators.min(1800), Validators.max(new Date().getFullYear())]],
    square_footage: [null, [Validators.min(1)]],
  });

  onSubmit(): void {
    if (this.inspectionForm.valid && !this.isLoading()) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.inspectionsService.createInspection(this.inspectionForm.value).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.created.emit(response);
          this.inspectionForm.reset();
        },
        error: (err) => {
          console.error('Failed to create inspection', err);
          this.errorMessage.set(err.error?.message || 'An unexpected error occurred. Please try again.');
          this.isLoading.set(false);
        }
      });
    } else {
      this.inspectionForm.markAllAsTouched();
    }
  }
}
