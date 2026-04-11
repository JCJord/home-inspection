import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-create-inspection',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TextInputComponent, LucideAngularModule],
  templateUrl: './create-inspection.component.html',
  styleUrl: './create-inspection.component.scss',
})
export class CreateInspectionComponent {
  private fb = inject(FormBuilder);

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<any>();

  readonly icons = { X };

  inspectionForm: FormGroup = this.fb.group({
    address: ['', [Validators.required]],
    client_name: ['', [Validators.required]],
    client_email: ['', [Validators.required, Validators.email]],
    year_built: [new Date().getFullYear(), [Validators.required, Validators.min(1800), Validators.max(new Date().getFullYear())]],
    square_footage: [null, [Validators.min(1)]],
  });

  onSubmit(): void {
    if (this.inspectionForm.valid) {
      this.created.emit(this.inspectionForm.value);
    } else {
      this.inspectionForm.markAllAsTouched();
    }
  }
}
