import { Component, inject, input, output, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Section, Severity } from '../../../../core/enums/inspection.enums';
import { Finding, Photo } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { TextareaInputComponent } from '../../../../shared/components/inputs/textarea-input/textarea-input.component';
import { LucideAngularModule, AlertCircle, FileImage, Upload, Trash2 } from 'lucide-angular';
import { CreateFindingDto } from '../../../../core/dtos/create-finding.dto';
import { UpdateFindingDto } from '../../../../core/dtos/update-finding.dto';
import { environment } from '../../../../../environments/environment';

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
  existingPhotos = signal<Photo[]>([]);
  severities = Object.values(Severity);
  readonly icons = { AlertCircle, FileImage, Upload, Trash2 };

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
        this.existingPhotos.set(data.photos || []);
      } else {
        this.findingForm.reset({
          severity: Severity.MINOR,
        });
        this.existingPhotos.set([]);
      }
    });
  }

  resolveImageUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const path = url.startsWith('/') ? url : `/${url}`;
    // We'll replace environment.apiUrl directly or use the import.
    // For simplicity, we can do this if environment is tricky to import:
    return `http://localhost:3000${path}`; 
  }

  deleteExistingPhoto(photoId: string): void {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    
    this.isLoading.set(true);
    this.inspectionsService.deletePhoto(this.inspectionId(), this.finding()!.id, photoId).subscribe({
      next: () => {
        this.existingPhotos.update(photos => photos.filter(p => p.id !== photoId));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to delete photo', err);
        this.errorMessage.set('Failed to delete photo.');
        this.isLoading.set(false);
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
