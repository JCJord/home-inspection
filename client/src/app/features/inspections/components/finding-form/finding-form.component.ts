import { Component, inject, output, signal, effect, computed, OnDestroy, Input, OnChanges, SimpleChanges, afterNextRender, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Section, Severity } from '../../../../core/enums/inspection.enums';
import { Finding, Photo } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
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
import { LocationComboboxComponent } from '../../../../shared/components/inputs/location-combobox/location-combobox.component';
import { DraftService } from '../../../../core/services/draft.service';
import { MutationQueueService, MutationType } from '../../../../core/services/mutation-queue.service';
import { ResolveImagePipe } from '../../../../shared/pipes/resolve-image.pipe';
import { debounceTime, map } from 'rxjs';
import { ImageCacheService } from '../../../../core/services/image-cache.service';

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
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TextareaInputComponent, LocationComboboxComponent, LucideAngularModule, ImageEditorModalComponent, PresetButtonComponent, ResolveImagePipe],
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
  private imageCache = inject(ImageCacheService);
  private destroyRef = inject(DestroyRef);


  @Input({ required: true }) inspectionId!: string;
  @Input({ required: true }) year_built!: number;
  @Input({ required: true }) section!: string;
  @Input() presets: TemplatePreset[] = [];
  @Input() locationPresets: string[] = [];
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
  deleted = output<Finding>();
  
  private idSwaps = new Map<string, string>();
  private currentResolvingFindingId: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['inspectionId']) this._inspectionId.set(this.inspectionId);
    if (changes['year_built']) this._yearBuilt.set(this.year_built);
    if (changes['section']) this._section.set(this.section);
    if (changes['finding']) {
      const prev = changes['finding'].previousValue;
      const curr = changes['finding'].currentValue;
      
      this._finding.set(this.finding);

      const prevId = prev?.id;
      const currId = curr?.id;
      
      const isIdSwap = prevId && currId && this.idSwaps.has(prevId) && this.idSwaps.get(prevId) === currId;

      if (isIdSwap) {
        this.idSwaps.delete(prevId);
        // Sync photos and resolve URLs without wiping input values, focus, or active file selections
        this.syncPhotoCaptions(curr?.photos || []);
        this.resolveExistingPhotos(curr?.photos || [], false);
        return;
      }

      if (prev?.id === curr?.id && this.findingForm.dirty) {
        // Prevent background sync from wiping unsaved changes for the SAME finding
        // But we must gracefully synchronize the photoCaptions FormArray with the new photos
        // to handle temp ID swaps without losing typed data.
        this.syncPhotoCaptions(curr?.photos || []);
        this.resolveExistingPhotos(curr?.photos || [], false);
        return;
      }

      // HARD RESET: If we are switching to a completely different finding,
      // we MUST clear any unsaved local photo selections from the previous finding
      // so they don't accidentally get attached to the new one!
      if (prev?.id !== curr?.id) {
        // Flush any unsaved dirty changes for the previous finding ID immediately!
        if (prevId && this.findingForm.dirty && prev?.section) {
          this.autoSaveFinding(prevId, prev.section, this.findingForm.value);
        }

        this.selectedFiles().forEach(item => {
          URL.revokeObjectURL(item.previewUrl);
        });
        this.selectedFiles.set([]);
        this.newPhotoCaptions.clear({ emitEvent: false });
        this.photoCaptions.clear({ emitEvent: false });

        // Reset UI signals so the new finding doesn't inherit the old one's save status
        this.isSaving.set(false);
        this.isSaved.set(false);
      }

      this.populateForm();
      this.resolveExistingPhotos(this.finding?.photos || [], prev?.id !== curr?.id);
    }
    if (changes['isPublished']) this._isPublished.set(this.isPublished);
  }

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isSaved = signal<boolean>(true);
  isGeneratingAi = signal<boolean>(false);
  aiErrorMessage = signal<string | null>(null);
  showSuccess = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  isEditMode = computed(() => !!this._finding());

  selectedFiles = signal<SelectedPhoto[]>([]);
  resolvedExistingPhotos = signal<(Photo & { resolvedUrl?: string })[]>([]);
  
  existingPhotos = computed(() => {
    return this._finding()?.photos || [];
  });

  photoToEdit = signal<EditTarget | null>(null);
  
  // Deletion Tracking
  activeDeleteExistingId = signal<string | null>(null);
  activeDeleteNewIndex = signal<number | null>(null);
  isConfirmingDeleteFinding = signal<boolean>(false);

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
    return `finding:${this.inspectionId}:${this.section}:${this._finding()?.id || 'new'}`;
  }

  get photoCaptions(): FormArray {
    return this.findingForm.get('photo_captions') as FormArray;
  }

  get newPhotoCaptions(): FormArray {
    return this.findingForm.get('new_photo_captions') as FormArray;
  }

  constructor() {
    this.mutationQueueService.taskCompleted$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(completion => {
      if (completion.clientFindingId && completion.result?.id) {
        this.idSwaps.set(completion.clientFindingId, completion.result.id.toString());
      }
    });

    effect(() => {
      // Handle publish state — only track _isPublished, nothing else.
      // Previously this tracked _finding() and _section() which caused
      // enable() to fire on every finding/section switch, risking phantom events.
      if (this._isPublished()) {
        this.findingForm.disable({ emitEvent: false });
      } else {
        this.findingForm.enable({ emitEvent: false });
      }
    });

    // Auto-save changes to the database and DraftService
    this.findingForm.valueChanges.pipe(
      map(value => ({ value, key: this.draftKey, findingId: this._finding()?.id, section: this._section() })),
      debounceTime(1000),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ value, key, findingId, section }) => {
      if (this._isPublished()) return;

      // BUG FIX #3: Abort COMPLETELY if the finding has changed since the keystroke.
      // Without this, the old finding's data gets saved as a ghost draft under the old key,
      // which then marks the form dirty on next visit and triggers a phantom PATCH.
      if (!findingId || findingId !== this._finding()?.id || section !== this._section()) {
        return;
      }

      // Save to drafts locally (only reached if finding hasn't changed)
      this.draftService.save(key, value);

      // Only auto-save if the form is valid and dirty
      if (this.findingForm.valid && this.findingForm.dirty) {
        this.autoSaveFinding(findingId, section, value);
      }
    });

    // Check for and restore drafts
    afterNextRender(() => {
      const currentFinding = this._finding();
      if (currentFinding) {
        const draft = this.draftService.load<any>(this.draftKey);
        if (draft) {
          this.findingForm.patchValue(draft, { emitEvent: false });
          this.findingForm.markAsDirty();
        }
      }
    });
  }

  ngOnDestroy() {
    this.selectedFiles().forEach(item => {
      URL.revokeObjectURL(item.previewUrl);
    });
  }

  populateForm() {
    const data = this._finding();
    if (!data) {
      // If we have no finding (e.g., adding a new finding or summary), reset form to empty defaults
      this.findingForm.reset({
        severity: Severity.MINOR,
        location: '',
        description: '',
        recommendation: '',
      }, { emitEvent: false });
      this.photoCaptions.clear({ emitEvent: false });
      this.newPhotoCaptions.clear({ emitEvent: false });
      this.findingForm.markAsPristine();
      return;
    }
    
    // Prevent triggering valueChanges subscription when resetting form values from server model
    this.findingForm.patchValue({
      severity: data.severity,
      location: data.location || '',
      description: data.description,
      recommendation: data.recommendation || '',
    }, { emitEvent: false });
    this.syncPhotoCaptions(data.photos || []);

    // Mark as pristine now that fresh model data has been applied
    this.findingForm.markAsPristine();

    // Restore draft if it exists (crucial for preserving unsaved changes across ID swaps)
    const draft = this.draftService.load<any>(this.draftKey);
    if (draft) {
      // BUG FIX #2: Deep-compare draft vs pristine server data.
      // If they're identical, this is a "ghost draft" created by Bug #1.
      // Delete it immediately instead of marking the form dirty.
      const pristineValue = this.findingForm.getRawValue();

      const normalize = (val: any): any => {
        if (val === '' || val === null || val === undefined) return null;
        if (Array.isArray(val)) return val.map(normalize);
        if (typeof val === 'object') {
          const res: any = {};
          for (const k of Object.keys(val).sort()) res[k] = normalize(val[k]);
          return res;
        }
        return val;
      };

      const isDifferent = JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(pristineValue));

      if (isDifferent) {
        this.findingForm.patchValue(draft, { emitEvent: false });
        this.findingForm.markAsDirty();
      } else {
        // Ghost draft — identical to server state. Kill it.
        this.draftService.clear(this.draftKey);
      }
    }
  }

  async resolveExistingPhotos(photos: Photo[], clearFirst = false) {
    const findingId = this._finding()?.id || null;
    this.currentResolvingFindingId = findingId;
    
    // Clear instantly only if switching findings
    if (clearFirst) {
      this.resolvedExistingPhotos.set([]);
    }

    const resolved = await Promise.all(photos.map(async p => {
      let resolvedUrl = p.storage_url;
      
      // Check if there is an active/completed task in the queue for this photo to reuse local preview URL
      const idStr = p.id?.toString();
      const matchingTask = idStr ? this.mutationQueueService.allTasks().find(t => 
        t.type === MutationType.UPLOAD_PHOTO && 
        (t.id === idStr || `temp-${t.id}` === idStr || (t as any).result?.id?.toString() === idStr)
      ) : null;

      if (matchingTask && (matchingTask as any).tempPreviewUrl) {
        resolvedUrl = (matchingTask as any).tempPreviewUrl;
      } else if (p.storage_url) {
        try {
          resolvedUrl = await this.imageCache.getImageUrl(p.storage_url);
        } catch (e) {
          resolvedUrl = p.storage_url;
        }
      }
      return { ...p, resolvedUrl };
    }));

    // Ensure we only apply if the finding has not switched during the async operations
    if ((this._finding()?.id || null) === findingId && this.currentResolvingFindingId === findingId) {
      this.resolvedExistingPhotos.set(resolved);
    }
  }

  trackPhoto(index: number, photo: any): string {
    if (photo.id) {
      const idStr = photo.id.toString();
      if (idStr.startsWith('temp-')) {
        return idStr;
      }
      const completedTask = this.mutationQueueService.allTasks().find(t => 
        t.type === MutationType.UPLOAD_PHOTO && 
        t.status === 'COMPLETED' && 
        (t as any).result?.id?.toString() === idStr
      );
      if (completedTask) {
        return `temp-${completedTask.id}`;
      }
      return idStr;
    }
    return index.toString();
  }

  syncPhotoCaptions(photos: Photo[]) {
    // Map current FormArray groups by their photo ID
    const currentGroups = new Map<string, FormGroup>();
    for (let i = 0; i < this.photoCaptions.length; i++) {
      const group = this.photoCaptions.at(i) as FormGroup;
      const id = group.get('id')?.value;
      if (id) {
        currentGroups.set(id.toString(), group);
      }
    }

    // Clear the FormArray
    this.photoCaptions.clear({ emitEvent: false });

    // Re-populate in the exact order of the incoming photos
    photos.forEach(p => {
      const idStr = p.id?.toString();
      let existingGroup = idStr ? currentGroups.get(idStr) : null;

      // Fallback: If a temp ID transitioned to a server ID, find the group by matching UPLOAD_PHOTO task
      if (!existingGroup && idStr) {
        const completedTask = this.mutationQueueService.allTasks().find(t => 
          t.type === MutationType.UPLOAD_PHOTO && 
          t.status === 'COMPLETED' && 
          (t as any).result?.id?.toString() === idStr
        );
        if (completedTask) {
          existingGroup = currentGroups.get(`temp-${completedTask.id}`);
        }
      }

      if (existingGroup) {
        // Update the ID control value to the new server ID if it swap-transitioned
        existingGroup.get('id')?.setValue(p.id, { emitEvent: false });
        
        // Only update the value from the incoming model if the user hasn't modified it locally
        if (!existingGroup.get('caption')?.dirty) {
          existingGroup.get('caption')?.setValue(p.caption || '', { emitEvent: false });
        }
        // BUG FIX #1: push() without emitEvent triggers valueChanges → ghost draft → phantom PATCH
        this.photoCaptions.push(existingGroup, { emitEvent: false });
      } else {
        this.photoCaptions.push(this.fb.group({
          id: [p.id],
          caption: [p.caption || '', [Validators.maxLength(100)]]
        }), { emitEvent: false });
      }
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

    // If the photo is still pending server confirmation (temp ID),
    // update the task payload in the background queue.
    if (photoId.startsWith('temp-')) {
      const taskId = photoId.replace('temp-', '');
      this.mutationQueueService.updateTaskPayload(taskId, { caption: caption || '' });
      return;
    }
    
    // Update local cache immediately
    const currentFinding = this._finding();
    if (currentFinding) {
      const updatedFinding = {
        ...currentFinding,
        photos: currentFinding.photos.map(p => p.id === photoId ? { ...p, caption: caption || '' } : p)
      };
      this.inspectionsService.updateLocalFinding(this._inspectionId(), updatedFinding).catch(err => {
        console.warn('Failed to update local finding cache on caption change:', err);
      });
    }

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

    // Find photo before removing it from the signal, so we can clean up cache
    const photoToDelete = this.resolvedExistingPhotos().find(p => p.id === photoId);
    if (photoToDelete && photoToDelete.storage_url) {
      this.imageCache.removeCachedImage(photoToDelete.storage_url).catch(err => {
        console.warn('Failed to remove image from cache:', err);
      });
    }

    // Optimistic UI Update: Remove from local list immediately
    this.resolvedExistingPhotos.update(photos => photos.filter(p => p.id !== photoId));

    // LOCAL CANCEL: If this is a temporary photo, cancel the upload task
    if (photoId.startsWith('temp-')) {
      const taskId = photoId.replace('temp-', '');
      this.mutationQueueService.cancelTask(taskId);
      return;
    }

    if (!findingId) return;

    const index = this.existingPhotos().findIndex(p => p.id === photoId);
    if (index > -1) {
      this.photoCaptions.removeAt(index);
    }

    // Update local IndexedDB cache of the finding immediately to remove the photo record
    const currentFinding = this._finding();
    if (currentFinding) {
      const updatedFinding = {
        ...currentFinding,
        photos: currentFinding.photos.filter(p => p.id !== photoId)
      };
      this.inspectionsService.updateLocalFinding(inspectionId, updatedFinding).catch(err => {
        console.warn('Failed to update local finding cache on delete photo:', err);
      });
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
        const index = this.existingPhotos().findIndex(p => p.id === oldPhoto.id);
        const caption = index > -1 ? this.photoCaptions.at(index).get('caption')?.value || '' : '';

        // OFFLINE-RESILIENT workflow: 
        if (oldPhoto.id.startsWith('temp-')) {
          const oldTaskId = oldPhoto.id.replace('temp-', '');
          await this.mutationQueueService.cancelTask(oldTaskId);
        } else {
          // 1. Enqueue Delete for the old one
          this.mutationQueueService.enqueue({
            type: MutationType.DELETE_PHOTO,
            inspectionId,
            findingId,
            payload: { photoId: oldPhoto.id }
          });
        }

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
    this.findingForm.markAsDirty();
  }

  isDragging = signal<boolean>(false);

  onDragOver(event: DragEvent): void {
    if (this.isPublishedSignal()) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    if (this.isPublishedSignal()) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    if (this.isPublishedSignal()) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files) {
      const filesArray = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (filesArray.length > 0) {
        await this.processFiles(filesArray);
      }
    }
  }
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const filesArray = Array.from(input.files);
      await this.processFiles(filesArray);
      // Reset input
      input.value = '';
    }
  }

  private async processFiles(filesArray: File[]): Promise<void> {
    const inspectionId = this._inspectionId();
    const findingId = this.isEditMode() ? this._finding()!.id : undefined;

    if (findingId) {
      // 1. If we have an existing finding, compress and immediately enqueue UPLOAD_PHOTO tasks (auto-save!)
      filesArray.forEach(async (file) => {
        const compressedFile = await this.compressionService.compressImage(file);
        const taskId = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(compressedFile);

        // Enqueue IMMEDIATELY for instant UI addition
        this.mutationQueueService.enqueue({
          id: taskId,
          type: MutationType.UPLOAD_PHOTO,
          inspectionId,
          findingId,
          file: compressedFile,
          payload: { caption: '', previewData: previewUrl }
        });

        // Upgrade task with base64 for persistent storage in background
        this.mutationQueueService.fileToBase64(compressedFile).then(base64 => {
          this.mutationQueueService.updateTaskPayload(taskId, { previewData: base64 });
        });
      });
    } else {
      // 2. If it's a brand new finding not saved yet, buffer them in selectedFiles as before
      const initialIndices: number[] = [];
      this.selectedFiles.update(files => {
        const currentCount = files.length;
        const newItems = filesArray.map((file, i) => {
          initialIndices.push(currentCount + i);
          this.newPhotoCaptions.push(this.fb.control('', [Validators.maxLength(100)]));
          return {
            file,
            previewUrl: URL.createObjectURL(file),
            isCompressing: true
          };
        });
        return [...newItems, ...files];
      });

      filesArray.forEach(async (file, index) => {
        const compressedFile = await this.compressionService.compressImage(file);
        this.selectedFiles.update(files => {
          const newFiles = [...files];
          if (newFiles[index]) {
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
    this.findingForm.markAsDirty();
  }

  isPresetActive(preset: any): boolean {
    const formValue = this.findingForm.value;
    const expectedDescription = preset.description 
      ? `[${preset.title}] ${preset.description}` 
      : preset.title;

    return formValue.severity === preset.severity && formValue.description === expectedDescription;
  }

  autoSaveFinding(targetFindingId: string, targetSection: string, formValue: any): void {
    const inspectionId = this._inspectionId();
    if (!inspectionId || !targetFindingId || !targetSection) return;

    this.isSaving.set(true);
    this.isSaved.set(false);

    // Clear draft locally since it is now enqueued in the persistent background queue
    const targetDraftKey = `finding:${inspectionId}:${targetSection}:${targetFindingId}`;
    this.draftService.clear(targetDraftKey);

    this.mutationQueueService.enqueue({
      type: MutationType.UPDATE_FINDING,
      inspectionId,
      findingId: targetFindingId,
      payload: {
        section: targetSection,
        severity: formValue.severity,
        description: formValue.description,
        recommendation: formValue.recommendation || undefined,
        location: formValue.location || undefined,
      }
    });

    // Mark as pristine so we don't trigger redundant updates until next change
    this.findingForm.markAsPristine();

    // Show saved micro-interaction — scoped to the target finding ID
    // so it can't bleed into a different finding if the user switches
    const savedForId = targetFindingId;
    setTimeout(() => {
      if (this._finding()?.id === savedForId) {
        this.isSaving.set(false);
        this.isSaved.set(true);
      }
    }, 800);
  }

  onSubmit(): void {
    if (this.findingForm.valid) {
      const formValue = this.findingForm.value;
      const inspectionId = this._inspectionId();
      const findingId = this._finding()?.id;
      const section = this._section();
      
      // Clear draft immediately
      this.draftService.clear(this.draftKey);

      if (this.findingForm.dirty && findingId) {
        this.autoSaveFinding(findingId, section, formValue);
      }

      // Optimistic Success: Emit saved immediately to close or navigate back
      const tempFinding: Finding = {
        id: this._finding()!.id,
        inspection_id: inspectionId,
        section: this._section(),
        severity: formValue.severity,
        description: formValue.description,
        recommendation: formValue.recommendation,
        location: formValue.location,
        photos: [
          ...(this._finding()?.photos || []),
        ] as any,
        isSyncing: true
      } as any;

      this.saved.emit(tempFinding);
      
      // Show Success Micro-interaction
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 2500);
      
      this.selectedFiles.set([]);
      this.newPhotoCaptions.clear();
    } else {
      this.findingForm.markAllAsTouched();
    }
  }

  onDeleteFinding(): void {
    if (this._finding()) {
      this.deleted.emit(this._finding()!);
    }
    this.isConfirmingDeleteFinding.set(false);
  }
}
