import { Component, inject, output, signal, effect, computed, OnDestroy, Input, OnChanges, SimpleChanges, afterNextRender } from '@angular/core';
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
import { DraftService } from '../../../../core/services/draft.service';
import { MutationQueueService, MutationType } from '../../../../core/services/mutation-queue.service';
import { ResolveImagePipe } from '../../../../shared/pipes/resolve-image.pipe';
import { debounceTime } from 'rxjs';

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
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TextInputComponent, TextareaInputComponent, LucideAngularModule, ImageEditorModalComponent, PresetButtonComponent, ResolveImagePipe],
  templateUrl: './finding-form.component.html',
  styleUrl: './finding-form.component.scss',
})
export class FindingFormComponent implements OnDestroy, OnChanges {
  private fb = inject(FormBuilder);
  private inspectionsService = inject(InspectionsService);
  private aiService = inject(AiService);
  private authService = inject(AuthService);
  private compressionService = inject(ImageCompressionService);
  private draftService = inject(DraftService);
  private mutationQueueService = inject(MutationQueueService);

  isPremium = this.authService.isPremium;

  @Input({ required: true }) inspectionId!: string;
  @Input({ required: true }) year_built!: number;
  @Input({ required: true }) section!: string;
  @Input() presets: TemplatePreset[] = [];
  @Input() finding: Finding | null = null;
  @Input() isPublished: boolean = false;

  private _inspectionId = signal<string>('');
  private _yearBuilt = signal<number>(0);
  private _section = signal<string>('');
  private _finding = signal<Finding | null>(null);
  private _isPublished = signal<boolean>(false);

  // Expose signals for internal use
  inspectionIdSignal = this._inspectionId.asReadonly();
  yearBuiltSignal = this._yearBuilt.asReadonly();
  sectionSignal = this._section.asReadonly();
  findingSignal = this._finding.asReadonly();
  isPublishedSignal = this._isPublished.asReadonly();

  close = output<void>();
  saved = output<Finding>();
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['inspectionId']) this._inspectionId.set(this.inspectionId);
    if (changes['year_built']) this._yearBuilt.set(this.year_built);
    if (changes['section']) this._section.set(this.section);
    if (changes['finding']) this._finding.set(this.finding);
    if (changes['isPublished']) this._isPublished.set(this.isPublished);
  }

  isLoading = signal<boolean>(false);
  isGeneratingAi = signal<boolean>(false);
  aiErrorMessage = signal<string | null>(null);
  showSuccess = signal<boolean>(false);
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
    description: ['', [Validators.required, Validators.maxLength(2200)]],
    recommendation: ['', [Validators.maxLength(800)]],
    photo_captions: this.fb.array([]),
    new_photo_captions: this.fb.array([])
  });

  private get draftKey(): string {
    return `finding:${this.inspectionId}:${this.section}:${this.finding?.id || 'new'}`;
  }

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
          description: data.description,
          recommendation: data.recommendation || '',
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
      
      // Handle publish state
      if (this._isPublished()) {
        this.findingForm.disable({ emitEvent: false });
      } else {
        this.findingForm.enable({ emitEvent: false });
      }
    });

    // Auto-save to DraftService on value changes
    this.findingForm.valueChanges.pipe(
      debounceTime(500)
    ).subscribe(value => {
      if (!this._isPublished()) {
        this.draftService.save(this.draftKey, value);
      }
    });

    // Check for and restore drafts
    // Moving this to an effect or keeping it here but ensuring it doesn't break validation
    afterNextRender(() => {
      const draft = this.draftService.load<any>(this.draftKey);
      if (draft && !this.isEditMode()) {
        this.findingForm.patchValue(draft, { emitEvent: false });
        this.findingForm.markAsDirty();
      }
    });
  }

  ngOnDestroy() {
    this.selectedFiles().forEach(item => {
      URL.revokeObjectURL(item.previewUrl);
    });
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
    
    // OFFLINE-RESILIENT: Push to background queue instead of direct call
    this.mutationQueueService.enqueue({
      type: MutationType.UPDATE_PHOTO,
      inspectionId: this._inspectionId(),
      findingId: this._finding()!.id,
      payload: { photoId, caption: caption || '' }
    });
  }

  confirmDeleteExistingPhoto(photoId: string): void {
    this.cancelDelete();
    const findingId = this._finding()?.id;
    const inspectionId = this._inspectionId();
    
    if (!inspectionId) return;

    // LOCAL CANCEL: If this is a temporary photo, just cancel the upload task
    if (photoId.startsWith('temp-')) {
      const taskId = photoId.replace('temp-', '');
      this.mutationQueueService.cancelTask(taskId);
      return;
    }

    if (!findingId) return;

    // Optimistic UI Update: Remove from local list immediately
    const index = this.existingPhotos().findIndex(p => p.id === photoId);
    if (index > -1) {
      this.existingPhotos.update(photos => photos.filter(p => p.id !== photoId));
      this.photoCaptions.removeAt(index);
    }

    // Push to Background Queue
    this.mutationQueueService.enqueue({
      type: MutationType.DELETE_PHOTO,
      inspectionId,
      findingId,
      payload: { photoId }
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
    const inspectionId = this._inspectionId();
    const findingId = this.isEditMode() ? this._finding()!.id : undefined;
    
    // 1. Compress
    this.compressionService.compressImage(rawFile).then(async file => {
      if (target.type === 'existing') {
        const oldPhoto = target.photo;
        const caption = this.photoCaptions.at(this.existingPhotos().findIndex(p => p.id === oldPhoto.id)).get('caption')?.value || '';

        // OFFLINE-RESILIENT workflow: 
        // 1. Enqueue Delete for the old one
        this.mutationQueueService.enqueue({
          type: MutationType.DELETE_PHOTO,
          inspectionId,
          findingId,
          payload: { photoId: oldPhoto.id }
        });

        // 2. Enqueue Upload for the new one (preserving caption)
        const taskId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);

        this.mutationQueueService.enqueue({
          id: taskId,
          type: MutationType.UPLOAD_PHOTO,
          inspectionId,
          findingId,
          file,
          payload: { caption, previewData: previewUrl }
        });

        // 3. Update the task with base64 for persistence
        this.mutationQueueService.fileToBase64(file).then(base64 => {
          this.mutationQueueService.updateTaskPayload(taskId, { previewData: base64 });
        });

      } else {
        // New file: just update the local array natively!
        this.selectedFiles.update(files => {
          const newArray = [...files];
          URL.revokeObjectURL(newArray[target.index!].previewUrl); 
          newArray[target.index!] = {
            file,
            previewUrl: URL.createObjectURL(file),
            isCompressing: false
          };
          return newArray;
        });
      }
      this.isLoading.set(false);
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

  generateAiComment() {
    const { severity, location, description } = this.findingForm.value;
    const yearBuilt = this._yearBuilt();

    if (!description || !location) {
      if (!description) this.findingForm.get('description')?.markAsTouched();
      if (!location) this.findingForm.get('location')?.markAsTouched();
      return;
    }

    this.isGeneratingAi.set(true);
    this.aiErrorMessage.set(null);

    this.aiService.generateComment({
      section: this._section(),
      severity,
      location,
      description,
      year_built: yearBuilt
    }).subscribe({
      next: (response) => {
        this.findingForm.patchValue({
          description: response.description,
          recommendation: response.recommendation
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

  applyPreset(preset: any): void {
    const descriptionValue = preset.description 
      ? `[${preset.title}] ${preset.description}` 
      : preset.title;

    this.findingForm.patchValue({
      severity: preset.severity || 'Minor',
      description: descriptionValue,
      recommendation: preset.recommendation || ''
    });
  }

  isPresetActive(preset: any): boolean {
    const formValue = this.findingForm.value;
    const expectedDescription = preset.description 
      ? `[${preset.title}] ${preset.description}` 
      : preset.title;

    return formValue.severity === preset.severity && formValue.description === expectedDescription;
  }

  onSubmit(): void {
    if (this.findingForm.valid) {
      const formValue = this.findingForm.value;
      const inspectionId = this._inspectionId();
      const clientFindingId = crypto.randomUUID();
      
      // Clear draft immediately
      this.draftService.clear(this.draftKey);

      if (this.isEditMode()) {
        const findingId = this._finding()!.id;
        this.mutationQueueService.enqueue({
          type: MutationType.UPDATE_FINDING,
          inspectionId,
          findingId,
          payload: {
            section: this._section(),
            severity: formValue.severity,
            description: formValue.description,
            recommendation: formValue.recommendation || undefined,
            location: formValue.location || undefined,
          }
        });
      } else {
        this.mutationQueueService.enqueue({
          type: MutationType.CREATE_FINDING,
          inspectionId,
          clientFindingId,
          payload: {
            section: this._section(),
            severity: formValue.severity,
            description: formValue.description,
            recommendation: formValue.recommendation || undefined,
            location: formValue.location || undefined,
          }
        });
      }

      // 2. Upload Photos (Instant enqueuing to prevent UI flicker)
      this.selectedFiles().forEach((item, index) => {
        const caption = this.newPhotoCaptions.at(index).value;
        const taskId = crypto.randomUUID();
        
        // Enqueue IMMEDIATELY with the synchronous blob URL for instant UI response
        this.mutationQueueService.enqueue({
          id: taskId,
          type: MutationType.UPLOAD_PHOTO,
          inspectionId,
          findingId: this.isEditMode() ? this._finding()!.id : undefined,
          clientFindingId: this.isEditMode() ? undefined : clientFindingId,
          file: item.file,
          payload: { caption, previewData: (item as any).previewUrl } 
        });

        // "Upgrade" the task with persistent Base64 in the background
        this.mutationQueueService.fileToBase64(item.file).then(base64 => {
          this.mutationQueueService.updateTaskPayload(taskId, { previewData: base64 });
        });
      });

      // 3. Clear local selection (Handoff complete)
      this.selectedFiles.set([]);
      this.newPhotoCaptions.clear();

      // Optimistic Success: Emit saved immediately
      // Create a "Temporary Finding" for the UI to display
      const tempFinding: Finding = {
        id: this.isEditMode() ? this._finding()!.id : clientFindingId,
        inspection_id: inspectionId,
        section: this._section(),
        severity: formValue.severity,
        description: formValue.description,
        recommendation: formValue.recommendation,
        location: formValue.location,
        photos: [
          ...(this._finding()?.photos || []), // Existing
          // We don't add the new ones here because mergePendingMutations 
          // will pick them up from the MutationQueueService immediately
        ] as any,
        isSyncing: true // Visual indicator
      } as any;

      this.saved.emit(tempFinding);
      
      // Show Success Micro-interaction
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 2500);
      
      // Clear selection state
      this.selectedFiles.set([]);
      this.newPhotoCaptions.clear();
    } else {
      this.findingForm.markAllAsTouched();
    }
  }
}
