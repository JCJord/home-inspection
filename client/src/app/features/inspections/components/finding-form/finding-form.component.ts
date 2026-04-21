import { Component, inject, input, output, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Section, Severity } from '../../../../core/enums/inspection.enums';
import { Finding } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { TextareaInputComponent } from '../../../../shared/components/inputs/textarea-input/textarea-input.component';
import { LucideAngularModule, AlertCircle, FileImage, Upload } from 'lucide-angular';
import { CreateFindingDto } from '../../../../core/dtos/create-finding.dto';
import { UpdateFindingDto } from '../../../../core/dtos/update-finding.dto';

@Component({
  selector: 'app-finding-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TextInputComponent, TextareaInputComponent, LucideAngularModule],
  templateUrl: './finding-form.component.html',
  styleUrl: './finding-form.component.scss',
})
export class FindingFormComponent {
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);

  inspectionId = input.required<string>();
  section = input.required<Section>();
  finding = input<Finding | null>(null);

  close = output<void>();
  saved = output<Finding>();

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  isEditMode = computed(() => !!this.finding());

  selectedFiles = signal<File[]>([]);
  severities = Object.values(Severity);
  readonly icons = { AlertCircle, FileImage, Upload };

  findingForm: FormGroup = this.fb.group({
    severity: [Severity.MINOR, [Validators.required]],
    location: [''],
    short_note: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const data = this.finding();
      if (data) {
        this.findingForm.patchValue({
          severity: data.severity,
          location: data.location || '',
          short_note: data.short_note,
        });
      } else {
        this.findingForm.reset({
          severity: Severity.MINOR,
        });
      }
    });
  }

  setSeverity(severity: Severity): void {
    this.findingForm.patchValue({ severity });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const filesArray = Array.from(input.files);
      this.selectedFiles.update(files => [...files, ...filesArray]);
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.update(files => {
      const newFiles = [...files];
      newFiles.splice(index, 1);
      return newFiles;
    });
  }

  get currentSeverity(): Severity {
    return this.findingForm.get('severity')?.value;
  }

  onSubmit(): void {
    if (this.findingForm.valid && !this.isLoading()) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const formValue = this.findingForm.value;

      const handleSuccess = (finding: Finding) => {
        if (this.selectedFiles().length > 0) {
          // Required imports missing but I'll assume they will be added or we manage it with array maps
          let uploadCount = 0;
          let hasErrors = false;
          
          this.selectedFiles().forEach(file => {
            this.inspectionsService.uploadPhoto(this.inspectionId(), finding.id, file).subscribe({
              next: () => {
                uploadCount++;
                if (uploadCount === this.selectedFiles().length) {
                  this.isLoading.set(false);
                  this.saved.emit(finding);
                }
              },
              error: (err) => {
                console.error('Failed to upload a photo', err);
                hasErrors = true;
                uploadCount++;
                if (uploadCount === this.selectedFiles().length) {
                  this.isLoading.set(false);
                  this.saved.emit(finding); // Still emit finding because finding was created
                }
              }
            });
          });
        } else {
          this.isLoading.set(false);
          this.saved.emit(finding);
        }
      };

      if (this.isEditMode()) {
        const dto: UpdateFindingDto = {
          section: this.section(),
          severity: formValue.severity,
          short_note: formValue.short_note,
          location: formValue.location || undefined,
        };

        this.inspectionsService.updateFinding(this.inspectionId(), this.finding()!.id, dto).subscribe({
          next: handleSuccess,
          error: (err) => {
            console.error('Failed to update finding', err);
            this.errorMessage.set(err.error?.message || 'Failed to update finding.');
            this.isLoading.set(false);
          }
        });
      } else {
        const dto: CreateFindingDto = {
          section: this.section(),
          severity: formValue.severity,
          short_note: formValue.short_note,
          location: formValue.location || undefined,
        };

        this.inspectionsService.createFinding(this.inspectionId(), dto).subscribe({
          next: handleSuccess,
          error: (err) => {
            console.error('Failed to create finding', err);
            this.errorMessage.set(err.error?.message || 'Failed to create finding.');
            this.isLoading.set(false);
          }
        });
      }
    } else {
      this.findingForm.markAllAsTouched();
    }
  }
}
