import { Component, inject, output, signal, effect, computed, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Section, Severity } from '../../../../core/enums/inspection.enums';
import { Finding, Photo } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TextInputComponent } from '../../../../shared/components/inputs/text-input/text-input.component';
import { TextareaInputComponent } from '../../../../shared/components/inputs/textarea-input/textarea-input.component';
import { LucideAngularModule, AlertCircle, FileImage, Upload, Trash2, Edit, X, Check, Sparkles, Loader2 } from 'lucide-angular';
import { CreateFindingDto } from '../../../../core/dtos/create-finding.dto';
import { UpdateFindingDto } from '../../../../core/dtos/update-finding.dto';
import { AiService } from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ImageCompressionService } from '../../../../core/services/image-compression.service';
import { environment } from '../../../../../environments/environment';
import { ImageEditorModalComponent } from '../../../../shared/components/image-editor-modal/image-editor-modal.component';
import { PresetButtonComponent } from '../../../../shared/components/preset-button/preset-button.component';

interface SelectedPhoto {
  file: File;
  previewUrl: string;
  isCompressing?: boolean;
  caption?: string;
}

type EditTarget = 
  | { type: 'existing', photo: Photo }
  | { type: 'new', index: number, previewUrl: string };

import { TemplatePreset } from '../../../../core/models/inspection.interface';

@Component({
  selector: 'app-finding-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TextInputComponent, TextareaInputComponent, LucideAngularModule, ImageEditorModalComponent, PresetButtonComponent],
  templateUrl: './finding-form.component.html',
  styleUrl: './finding-form.component.scss',
})
export class FindingFormComponent implements OnDestroy, OnChanges {
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);
  private aiService = inject(AiService);
  private authService = inject(AuthService);
  private compressionService = inject(ImageCompressionService);

  isPremium = this.authService.isPremium;

  @Input({ required: true }) inspectionId!: string;
  @Input({ required: true }) year_built!: number;
  @Input({ required: true }) section!: string;
  @Input() presets: TemplatePreset[] = [];
  @Input() finding: Finding | null = null;

  private _inspectionId = signal<string>('');
  private _yearBuilt = signal<number>(0);
  private _section = signal<string>('');
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
  isGeneratingAi = signal(false);
  aiErrorMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  isEditMode = computed(() => !!this._finding());

  selectedFiles = signal<SelectedPhoto[]>([]);
  existingPhotos = signal<Photo[]>([]);
  photoToEdit = signal<EditTarget | null>(null);
  
  // Deletion Tracking
  activeDeleteExistingId = signal<string | null>(null);
  activeDeleteNewIndex = signal<number | null>(null);

  severities = Object.values(Severity);
  readonly icons = { AlertCircle, FileImage, Upload, Trash2, Edit, X, Check, Sparkles, Loader2 };

  findingForm: FormGroup = this.fb.group({
    severity: [Severity.MINOR, [Validators.required]],
    location: [''],
    short_note: ['', [Validators.required, Validators.maxLength(2200)]],
    ai_comment: ['', [Validators.maxLength(800)]],
    photo_captions: this.fb.array([]),
    new_photo_captions: this.fb.array([])
  });

  get photoCaptions(): FormArray {
    return this.findingForm.get('photo_captions') as FormArray;
  }

  get newPhotoCaptions(): FormArray {
    return this.findingForm.get('new_photo_captions') as FormArray;
  }

  constructor() {
    effect(() => {
      const data = this._finding();
      const section = this._section(); // Watch section changes to reset form if needed
      
      if (data) {
        this.findingForm.patchValue({
          severity: data.severity,
          location: data.location || '',
          short_note: data.short_note,
          ai_comment: data.ai_comment || '',
        });
        this.existingPhotos.set(data.photos || []);
        
        // Clear and rebuild FormArray
        this.photoCaptions.clear();
        (data.photos || []).forEach(p => {
          this.photoCaptions.push(this.fb.group({
            id: [p.id],
            caption: [p.caption || '']
          }));
        });
      } else {
        this.findingForm.reset({
          severity: Severity.MINOR,
        });
        this.existingPhotos.set([]);
        this.photoCaptions.clear();
        this.newPhotoCaptions.clear();
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
    return `${environment.apiUrl}${path}`; 
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

  onCaptionBlur(index: number): void {
    const photoGroup = this.photoCaptions.at(index);
    const photoId = photoGroup.get('id')?.value;
    const caption = photoGroup.get('caption')?.value;

    if (!photoId || !this._inspectionId() || !this._finding()) return;
    
    this.inspectionsService.updatePhoto(this._inspectionId(), this._finding()!.id, photoId, {
      caption: caption || ''
    }).subscribe({
      error: (err) => {
        console.error('Failed to update caption', err);
        this.errorMessage.set('Failed to save caption.');
      }
    });
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
    this.newPhotoCaptions.removeAt(index);
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

    this.isLoading.set(true);
    const rawFile = new File([blob], `edited_${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    // Compress edited image too
    this.compressionService.compressImage(rawFile).then(file => {
      if (target.type === 'existing') {
          const photo = target.photo;
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
                 previewUrl: URL.createObjectURL(file),
                 isCompressing: false
              };
              return newArray;
          });
          this.isLoading.set(false);
      }
    });
  }

  setSeverity(severity: Severity): void {
    this.findingForm.patchValue({ severity });
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const filesArray = Array.from(input.files);
      
      // 1. Add all files with a loading state first
      const initialIndices: number[] = [];
        this.selectedFiles.update(files => {
        const currentCount = files.length;
        const newItems = filesArray.map((file, i) => {
          initialIndices.push(currentCount + i);
          // Also add a form control for each new file
          this.newPhotoCaptions.push(this.fb.control(''));
          return {
            file,
            previewUrl: URL.createObjectURL(file),
            isCompressing: true
          };
        });
        return [...newItems, ...files];
      });

      // 2. Compress each file and update individually
      // We process them in parallel but update the signal for each
      filesArray.forEach(async (file, index) => {
        const compressedFile = await this.compressionService.compressImage(file);
        
        this.selectedFiles.update(files => {
          const newFiles = [...files];
          // Note: Since we prepend, we need to find the correct index if it shifted.
          // But since we are doing this immediately, the index should be stable for this batch
          // relative to the start of the array.
          if (newFiles[index]) {
            // Revoke old preview and create new one for compressed file
            URL.revokeObjectURL(newFiles[index].previewUrl);
            newFiles[index] = {
              file: compressedFile,
              previewUrl: URL.createObjectURL(compressedFile),
              isCompressing: false
            };
          }
          return newFiles;
        });
      });

      // Reset input
      input.value = '';
    }
  }

  get currentSeverity(): Severity {
    return this.findingForm.get('severity')?.value;
  }

  generateAiComment(): void {
    const { severity, location, short_note } = this.findingForm.value;
    
    // Clear previous errors
    this.aiErrorMessage.set(null);
    this.errorMessage.set(null);

    if (!short_note || !location) {
      if (!short_note) this.findingForm.get('short_note')?.markAsTouched();
      if (!location) this.findingForm.get('location')?.markAsTouched();
      
      this.aiErrorMessage.set('Location and Observation Note are required for AI generation.');
      return;
    }

    this.isGeneratingAi.set(true);

    this.aiService.generateComment({
      section: this._section(),
      severity,
      location: location || '',
      short_note,
      year_built: this.year_built
    }).subscribe({
      next: (response) => {
        this.findingForm.patchValue({
          ai_comment: response.comment
        });
        this.isGeneratingAi.set(false);
      },
      error: (err) => {
        console.error('AI error:', err);
        this.aiErrorMessage.set(err.error?.message || 'Failed to generate AI comment. Please try again.');
        this.isGeneratingAi.set(false);
      }
    });
  }

  applyPreset(preset: TemplatePreset): void {
    // TODO: Split into explicit title/description fields in Phase 2
    const shortNoteValue = preset.description 
      ? `[${preset.title}] ${preset.description}` 
      : preset.title;

    this.findingForm.patchValue({
      severity: preset.severity || 'Minor',
      short_note: shortNoteValue
    });
  }

  isPresetActive(preset: TemplatePreset): boolean {
    const formValue = this.findingForm.value;
    const expectedShortNote = preset.description 
      ? `[${preset.title}] ${preset.description}` 
      : preset.title;

    return formValue.severity === preset.severity && formValue.short_note === expectedShortNote;
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
          
          this.selectedFiles().forEach((item, index) => {
            const caption = this.newPhotoCaptions.at(index).value;
            this.inspectionsService.uploadPhoto(this._inspectionId(), finding.id, item.file, caption).subscribe({
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
