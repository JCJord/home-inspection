import { Component, inject, output, signal, effect, computed, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Section, Severity } from '../../../../core/enums/inspection.enums';
import { Finding, Photo } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { TextareaInputComponent } from '../../../../shared/components/inputs/textarea-input/textarea-input.component';
import { LucideAngularModule, AlertCircle, FileImage, Upload, Trash2, Edit, X, Check, Sparkles } from 'lucide-angular';
import { CreateFindingDto } from '../../../../core/dtos/create-finding.dto';
import { UpdateFindingDto } from '../../../../core/dtos/update-finding.dto';
import { AiService } from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';
import { ImageEditorModalComponent } from '../../../../shared/components/image-editor-modal/image-editor-modal.component';

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

type EditTarget = 
  | { type: 'existing', photo: Photo }
  | { type: 'new', index: number, previewUrl: string };

@Component({
  selector: 'app-finding-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TextInputComponent, TextareaInputComponent, LucideAngularModule, ImageEditorModalComponent],
  templateUrl: './finding-form.component.html',
  styleUrl: './finding-form.component.scss',
})
export class FindingFormComponent implements OnDestroy, OnChanges {
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);
  private aiService = inject(AiService);
  private authService = inject(AuthService);

  isPremium = this.authService.isPremium;

  @Input({ required: true }) inspectionId!: string;
  @Input({ required: true }) year_built!: number;
  @Input({ required: true }) section!: Section;
  @Input() finding: Finding | null = null;

  private _inspectionId = signal<string>('');
  private _yearBuilt = signal<number>(0);
  private _section = signal<Section>(Section.EXTERIOR);
  private _finding = signal<Finding | null>(null);

  // Expose signals for internal use
  inspectionIdSignal = this._inspectionId.asReadonly();
  yearBuiltSignal = this._yearBuilt.asReadonly();
  sectionSignal = this._section.asReadonly();
  findingSignal = this._finding.asReadonly();

  close = output<void>();
  saved = output<Finding>();
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['inspectionId']) this._inspectionId.set(this.inspectionId);
    if (changes['year_built']) this._yearBuilt.set(this.year_built);
    if (changes['section']) this._section.set(this.section);
    if (changes['finding']) this._finding.set(this.finding);
  }

  isLoading = signal<boolean>(false);
  isGeneratingAi = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  isEditMode = computed(() => !!this._finding());

  selectedFiles = signal<SelectedPhoto[]>([]);
  existingPhotos = signal<Photo[]>([]);
  photoToEdit = signal<EditTarget | null>(null);
  
  // Deletion Tracking
  activeDeleteExistingId = signal<string | null>(null);
  activeDeleteNewIndex = signal<number | null>(null);

  severities = Object.values(Severity);
  readonly icons = { AlertCircle, FileImage, Upload, Trash2, Edit, X, Check, Sparkles };

  findingForm: FormGroup = this.fb.group({
    severity: [Severity.MINOR, [Validators.required]],
    location: [''],
    short_note: ['', [Validators.required]],
    ai_comment: [''],
  });

  constructor() {
    effect(() => {
      const data = this._finding();
      if (data) {
        this.findingForm.patchValue({
          severity: data.severity,
          location: data.location || '',
          short_note: data.short_note,
          ai_comment: data.ai_comment || '',
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

  ngOnDestroy() {
    this.selectedFiles().forEach(item => {
      URL.revokeObjectURL(item.previewUrl);
    });
  }

  resolveImageUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `http://localhost:3000${path}`; 
  }

  // Two-step Delete Flow
  initDeleteExistingPhoto(photoId: string): void {
    this.activeDeleteExistingId.set(photoId);
    this.activeDeleteNewIndex.set(null);
  }

  initDeleteNewPhoto(index: number): void {
    this.activeDeleteNewIndex.set(index);
    this.activeDeleteExistingId.set(null);
  }

  cancelDelete(): void {
    this.activeDeleteExistingId.set(null);
    this.activeDeleteNewIndex.set(null);
  }

  confirmDeleteExistingPhoto(photoId: string): void {
    this.cancelDelete();
    this.isLoading.set(true);
    this.inspectionsService.deletePhoto(this._inspectionId(), this._finding()!.id, photoId).subscribe({
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

  removeFile(index: number): void {
    this.cancelDelete();
    this.selectedFiles.update(files => {
      const newFiles = [...files];
      URL.revokeObjectURL(newFiles[index].previewUrl);
      newFiles.splice(index, 1);
      return newFiles;
    });
  }

  editExistingPhoto(photo: Photo): void {
    this.photoToEdit.set({ type: 'existing', photo });
  }

  editNewPhoto(index: number, previewUrl: string): void {
    this.photoToEdit.set({ type: 'new', index, previewUrl });
  }

  onSavePhotoEdit(blob: Blob): void {
    const target = this.photoToEdit();
    if (!target) return;
    
    this.photoToEdit.set(null);

    const file = new File([blob], `edited_${Date.now()}.jpg`, { type: 'image/jpeg' });

    if (target.type === 'existing') {
        const photo = target.photo;
        this.isLoading.set(true);

        // Upload new photo
        this.inspectionsService.uploadPhoto(this._inspectionId(), this._finding()!.id, file).subscribe({
          next: (newPhoto) => {
            // Delete the old photo
            this.inspectionsService.deletePhoto(this._inspectionId(), this._finding()!.id, photo.id).subscribe({
              next: () => {
                this.existingPhotos.update(photos => {
                  const newPhotos = [...photos];
                  const idx = newPhotos.findIndex(p => p.id === photo.id);
                  if (idx > -1) {
                    newPhotos[idx] = newPhoto; 
                  } else {
                    newPhotos.push(newPhoto);
                  }
                  return newPhotos;
                });
                this.isLoading.set(false);
              },
              error: (err) => {
                console.error('Failed to delete old photo', err);
                this.errorMessage.set('Photo updated but old version failed to delete from server.');
                this.isLoading.set(false);
              }
            });
          },
          error: (err) => {
            console.error('Failed to upload edited photo', err);
            this.errorMessage.set('Failed to save edited photo.');
            this.isLoading.set(false);
          }
        });
    } else {
        // New file: just update the local array natively!
        this.selectedFiles.update(files => {
            const newArray = [...files];
            URL.revokeObjectURL(newArray[target.index].previewUrl); 
            newArray[target.index] = {
               file,
               previewUrl: URL.createObjectURL(file)
            };
            return newArray;
        });
    }
  }

  setSeverity(severity: Severity): void {
    this.findingForm.patchValue({ severity });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const filesArray = Array.from(input.files);
      const newItems = filesArray.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }));
      this.selectedFiles.update(files => [...files, ...newItems]);
    }
  }

  get currentSeverity(): Severity {
    return this.findingForm.get('severity')?.value;
  }

  generateAiComment(): void {
    const { severity, location, short_note } = this.findingForm.value;
    
    if (!short_note) {
      this.errorMessage.set('Please provide an observation note first.');
      return;
    }

    this.isGeneratingAi.set(true);
    this.errorMessage.set(null);

    this.aiService.generateComment({
      section: this._section(),
      severity,
      location,
      short_note,
      year_built: this._yearBuilt()
    }).subscribe({
      next: (res) => {
        this.findingForm.patchValue({ ai_comment: res.comment });
        this.isGeneratingAi.set(false);
      },
      error: (err) => {
        console.error('AI Generation failed', err);
        this.errorMessage.set('Failed to generate AI comment. Please try again.');
        this.isGeneratingAi.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.findingForm.valid && !this.isLoading()) {
      this.isLoading.set(true);
      this.errorMessage.set(null);

      const formValue = this.findingForm.value;

      const handleSuccess = (finding: Finding) => {
        if (this.selectedFiles().length > 0) {
          let uploadCount = 0;
          let hasErrors = false;
          
          this.selectedFiles().forEach(item => {
            this.inspectionsService.uploadPhoto(this._inspectionId(), finding.id, item.file).subscribe({
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
                  this.saved.emit(finding);
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
          section: this._section(),
          severity: formValue.severity,
          short_note: formValue.short_note,
          ai_comment: formValue.ai_comment || undefined,
          location: formValue.location || undefined,
        };

        this.inspectionsService.updateFinding(this._inspectionId(), this._finding()!.id, dto).subscribe({
          next: handleSuccess,
          error: (err) => {
            console.error('Failed to update finding', err);
            this.errorMessage.set(err.error?.message || 'Failed to update finding.');
            this.isLoading.set(false);
          }
        });
      } else {
        const dto: CreateFindingDto = {
          section: this._section(),
          severity: formValue.severity,
          short_note: formValue.short_note,
          ai_comment: formValue.ai_comment || undefined,
          location: formValue.location || undefined,
        };

        this.inspectionsService.createFinding(this._inspectionId(), dto).subscribe({
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
