import { inject, Injectable, signal, computed, Injector } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, of, from, mergeMap, catchError, concat, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Inspection, Finding, Photo } from '../models/inspection.interface';
import { CreateInspectionDto } from '../dtos/create-inspection.dto';
import { UpdateInspectionDto } from '../dtos/update-inspection.dto';
import { CreateFindingDto } from '../dtos/create-finding.dto';
import { UpdateFindingDto } from '../dtos/update-finding.dto';
import { ReorderFindingsDto } from '../dtos/reorder-findings.dto';
import { ReorderPhotosDto } from '../dtos/reorder-photos.dto';
import { PersistenceService } from './persistence.service';
import { MutationQueueService, MutationType } from './mutation-queue.service';
import { ImageCacheService } from './image-cache.service';

@Injectable({
  providedIn: 'root',
})
export class InspectionsService {
  private http = inject(HttpClient);
  private persistenceService = inject(PersistenceService);
  private imageCacheService = inject(ImageCacheService);
  private injector = inject(Injector);
  private apiUrl = `${environment.apiUrl}/inspections`;

  private get mutationQueueService() {
    return this.injector.get(MutationQueueService);
  }
  private readonly CACHE_KEY = 'ins_cached_list';

  // --- State Store ---
  private _inspections = signal<Inspection[]>([]);
  private _totalCount = signal<number>(0);
  private _isLoading = signal<boolean>(false);
  private _needsRefresh = signal<boolean>(true); // Start true to ensure initial fetch

  inspections = this._inspections.asReadonly();
  totalCount = this._totalCount.asReadonly();
  isLoading = this._isLoading.asReadonly();

  constructor() {
    this.loadFromCache();
  }

  private loadFromCache(): void {
    const cached = localStorage.getItem(this.CACHE_KEY);
    if (cached) {
      try {
        const { data, total } = JSON.parse(cached);
        this._inspections.set(data);
        this._totalCount.set(total);
      } catch (e) {
        console.warn('Failed to parse cached inspections', e);
      }
    }
  }

  private saveToCache(data: Inspection[], total: number): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify({ data, total }));
  }

  // --- Inspection Methods ---

  getInspections(page: number = 1, limit: number = 10, forceRefresh: boolean = false, status?: string, search?: string): Observable<{ data: Inspection[], meta: { total: number, page: number, limit: number, totalPages: number } }> {
    // Return cached data if not stale and not forced (only for unfiltered queries)
    if (!status && !search && !this._needsRefresh() && !forceRefresh && this._inspections().length > 0 && page === 1) {
      return of({
        data: this._inspections(),
        meta: {
          total: this._totalCount(),
          page: 1,
          limit: 10,
          totalPages: Math.ceil(this._totalCount() / 10)
        }
      });
    }

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }
    
    if (search) {
      params = params.set('search', search);
    }

    // Only show loading spinner if we have no data at all
    if (this._inspections().length === 0) {
      this._isLoading.set(true);
    }

    return this.http.get<{ data: Inspection[], meta: { total: number, page: number, limit: number, totalPages: number } }>(this.apiUrl, { params }).pipe(
      tap({
        next: (res) => {
          // Only update main cache for unfiltered queries
          if (!status) {
            this._inspections.set(res.data);
            this._totalCount.set(res.meta.total);
            if (page === 1) {
              this.saveToCache(res.data, res.meta.total);
              this._needsRefresh.set(false);
            } else {
              this._needsRefresh.set(true);
            }
          }
          this._isLoading.set(false);
        },
        error: () => this._isLoading.set(false)
      })
    );
  }

  getInspectionById(id: string): Observable<Inspection> {
    // Try to get from cache first, then fetch from network and update cache (SWR)
    return from(this.persistenceService.getInspection(id)).pipe(
      mergeMap(cached => {
        const network$ = this.http.get<Inspection>(`${this.apiUrl}/${id}`).pipe(
          map(fresh => this.mergePendingMutations(fresh)), // <--- IMPORTANT: Inject pending items
          tap(fresh => {
            this.persistenceService.saveInspection(fresh);
            this.imageCacheService.prefetchInspection(fresh); // <--- BACKGROUND PREFETCH
          }),
          catchError(err => {
            // If network fails, and we already have cached, return it.
            if (cached) return of(this.mergePendingMutations(cached));
            throw err;
          })
        );

        if (cached) {
          // Prefetch cached one too just in case some photos are missing
          this.imageCacheService.prefetchInspection(cached);
          // Emit cached immediately, then the network response
          return concat(of(this.mergePendingMutations(cached)), network$);
        }

        return network$;
      })
    );
  }

  public mergePendingMutations(inspection: Inspection): Inspection {
    const pendingTasks = this.mutationQueueService.allTasks()
      .filter(t => t.inspectionId === inspection.id);

    if (pendingTasks.length === 0) return inspection;

    // Create a deep-ish clone to avoid reference pollution
    const merged: Inspection = {
      ...inspection,
      metadata_values: { ...(inspection.metadata_values || {}) },
      section_statuses: { ...(inspection.section_statuses || {}) },
      findings: (inspection.findings || []).map(f => ({ ...f, photos: [...(f.photos || [])] }))
    };

    pendingTasks.forEach(task => {
      // 1. Handle Inspection Updates
      if (task.type === MutationType.UPDATE_INSPECTION) {
        const payload = task.payload;
        if (payload.metadata_values) {
          merged.metadata_values = { ...merged.metadata_values, ...payload.metadata_values };
        }
        if (payload.section_statuses) {
          merged.section_statuses = { ...merged.section_statuses, ...payload.section_statuses };
        }
      }

      // 2. Handle Finding Creation
      if (task.type === MutationType.CREATE_FINDING) {
        const payload = task.payload;
        const exists = merged.findings?.some(f => f.id === (task.clientFindingId || task.id));
        if (!exists) {
          merged.findings?.push({
            id: task.clientFindingId || task.id,
            inspection_id: merged.id,
            section: payload.section,
            severity: payload.severity,
            description: payload.description,
            location: payload.location,
            recommendation: payload.recommendation,
            photos: [],
            isSyncing: task.status !== 'COMPLETED'
          } as any);
        }
      }

      // 3. Handle Finding Updates
      if (task.type === MutationType.UPDATE_FINDING) {
        const idx = merged.findings?.findIndex(f => f.id === task.findingId);
        if (idx !== undefined && idx > -1) {
          const f = merged.findings![idx];
          merged.findings![idx] = {
            ...f,
            ...task.payload,
            isSyncing: task.status !== 'COMPLETED'
          };
        }
      }

      // 4. Handle Photo Uploads
      if (task.type === MutationType.UPLOAD_PHOTO) {
        const targetId = task.findingId || task.clientFindingId;
        const finding = merged.findings?.find(f => f.id === targetId);

        if (finding) {
          const tempId = `temp-${task.id}`;
          const serverPhotoId = (task as any).result?.id;
          const isConfirmedByServer = serverPhotoId && (finding.photos || []).some(p => p.id === serverPhotoId);
          const isRedundant = task.status === 'COMPLETED' && isConfirmedByServer;

          if (!isRedundant) {
            const photos = finding.photos || [];
            const existingIndex = photos.findIndex(p => p.id === tempId);
            const tempPhoto = {
              id: tempId,
              storage_url: (task as any).tempPreviewUrl || '',
              caption: task.payload.caption,
              isSyncing: task.status === 'PENDING' || task.status === 'SYNCING',
              hasError: task.status === 'FAILED'
            };

            if (existingIndex > -1) {
              photos[existingIndex] = { ...photos[existingIndex], ...tempPhoto };
            } else {
              photos.push(tempPhoto as any);
            }
            finding.photos = photos;
          }
        }
      }

      // 5. Handle Photo Caption Updates
      if (task.type === MutationType.UPDATE_PHOTO) {
        const finding = merged.findings?.find(f => f.id === task.findingId);
        if (finding) {
          const photo = finding.photos.find(p => p.id === task.payload.photoId);
          if (photo) {
            photo.caption = task.payload.caption;
            photo.isSyncing = task.status === 'PENDING' || task.status === 'SYNCING';
            (photo as any).hasError = task.status === 'FAILED';
          }
        }
      }

      // 6. Handle Photo Deletion
      if (task.type === MutationType.DELETE_PHOTO) {
        const finding = merged.findings?.find(f => f.id === task.findingId);
        if (finding) {
          finding.photos = finding.photos.filter(p => p.id !== task.payload.photoId);
        }
      }
    });

    return merged;
  }

  createInspection(dto: CreateInspectionDto): Observable<Inspection> {
    return this.http.post<Inspection>(this.apiUrl, dto).pipe(
      tap(newIns => {
        this._inspections.update(list => [newIns, ...list]);
        this._totalCount.update(c => c + 1);
        this.saveToCache(this._inspections(), this._totalCount());
        this._needsRefresh.set(true); // Mark as stale
      })
    );
  }

  updateInspection(id: string, dto: UpdateInspectionDto): Observable<Inspection> {
    return this.http.patch<Inspection>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(updatedIns => {
        this._inspections.update(list => list.map(i => i.id === id ? updatedIns : i));
        this.saveToCache(this._inspections(), this._totalCount());
        this._needsRefresh.set(true); // Mark as stale
      })
    );
  }

  deleteInspection(id: string): Observable<void> {
    // Optimistic Update
    const prevList = this._inspections();
    const prevCount = this._totalCount();
    this._inspections.update(list => list.filter(i => i.id !== id));
    this._totalCount.update(c => c - 1);
    this.saveToCache(this._inspections(), this._totalCount());
    this._needsRefresh.set(true); // Mark as stale

    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  publishInspection(id: string): Observable<Inspection> {
    return this.http.post<Inspection>(`${this.apiUrl}/${id}/publish`, {}).pipe(
      tap((updatedIns) => {
        // Update state store and list cache
        this._inspections.update(list => list.map(i => i.id === id ? updatedIns : i));
        this.saveToCache(this._inspections(), this._totalCount());
        this._needsRefresh.set(true);

        // Garbage Collection: Remove from individual inspection cache after successful publish
        this.persistenceService.deleteInspection(id).catch(err =>
          console.warn('Failed to clean up cache after publish', err)
        );
      })
    );
  }

  unpublishInspection(id: string): Observable<Inspection> {
    return this.http.post<Inspection>(`${this.apiUrl}/${id}/unpublish`, {}).pipe(
      tap((updatedIns) => {
        this._inspections.update(list => list.map(i => i.id === id ? updatedIns : i));
        this.saveToCache(this._inspections(), this._totalCount());
        this._needsRefresh.set(true);
      })
    );
  }

  cancelInspection(id: string): Observable<Inspection> {
    return this.http.post<Inspection>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      tap((updatedIns) => {
        this._inspections.update(list => list.map(i => i.id === id ? updatedIns : i));
        this.saveToCache(this._inspections(), this._totalCount());
        this._needsRefresh.set(true);
      })
    );
  }

  startInspection(id: string): Observable<Inspection> {
    return this.http.patch<Inspection>(`${this.apiUrl}/${id}/start`, {}).pipe(
      tap((updatedIns) => {
        this._inspections.update(list => list.map(i => i.id === id ? updatedIns : i));
        this.saveToCache(this._inspections(), this._totalCount());
        this._needsRefresh.set(true);
      })
    );
  }

  updatePhoto(inspectionId: string, findingId: string, photoId: string, dto: { caption: string }): Observable<Photo> {
    return this.http.patch<Photo>(`${this.apiUrl}/${inspectionId}/findings/${findingId}/photos/${photoId}`, dto);
  }

  uploadCoverPhoto(id: string, file: File): Observable<Inspection> {
    const formData = new FormData();
    formData.append('cover_photo', file);
    return this.http.post<Inspection>(`${this.apiUrl}/${id}/cover-photo`, formData).pipe(
      tap((updatedIns) => {
        this._inspections.update(list => list.map(i => i.id === id ? updatedIns : i));
        this.saveToCache(this._inspections(), this._totalCount());
        this._needsRefresh.set(true);
      })
    );
  }

  // --- Finding Methods ---

  /**
   * Fetches findings for a specific inspection.
   * @param inspectionId The ID of the inspection
   * @param section Optional filter by section (e.g., 'Roof', 'Electrical')
   */
  getFindings(inspectionId: string, section?: string): Observable<Finding[]> {
    let params = new HttpParams();
    if (section) {
      params = params.set('section', section);
    }
    return this.http.get<Finding[]>(`${this.apiUrl}/${inspectionId}/findings`, { params });
  }

  getFinding(inspectionId: string, findingId: string): Observable<Finding> {
    return this.http.get<Finding>(`${this.apiUrl}/${inspectionId}/findings/${findingId}`);
  }

  createFinding(inspectionId: string, dto: CreateFindingDto): Observable<Finding> {
    return this.http.post<Finding>(`${this.apiUrl}/${inspectionId}/findings`, dto);
  }

  updateFinding(inspectionId: string, findingId: string, dto: UpdateFindingDto): Observable<Finding> {
    return this.http.patch<Finding>(`${this.apiUrl}/${inspectionId}/findings/${findingId}`, dto);
  }

  deleteFinding(inspectionId: string, findingId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${inspectionId}/findings/${findingId}`);
  }

  reorderFindings(inspectionId: string, dto: ReorderFindingsDto): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${inspectionId}/findings/reorder`, dto);
  }

  generateAiComment(inspectionId: string, findingId: string): Observable<{ comment: string }> {
    return this.http.post<{ comment: string }>(`${this.apiUrl}/${inspectionId}/findings/${findingId}/ai-comment`, {});
  }

  // --- Photo Methods ---

  getPhotos(inspectionId: string, findingId: string): Observable<Photo[]> {
    return this.http.get<Photo[]>(`${this.apiUrl}/${inspectionId}/findings/${findingId}/photos`);
  }

  uploadPhoto(inspectionId: string, findingId: string, file: File, caption?: string): Observable<Photo> {
    const formData = new FormData();
    formData.append('photo', file);
    if (caption) {
      formData.append('caption', caption);
    }
    return this.http.post<Photo>(`${this.apiUrl}/${inspectionId}/findings/${findingId}/photos`, formData);
  }

  deletePhoto(inspectionId: string, findingId: string, photoId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${inspectionId}/findings/${findingId}/photos/${photoId}`);
  }

  reorderPhotos(inspectionId: string, findingId: string, dto: ReorderPhotosDto): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${inspectionId}/findings/${findingId}/photos/reorder`, dto);
  }

  // --- Persistence Bridge ---
  async updateLocalCache(inspection: Inspection): Promise<void> {
    await this.persistenceService.saveInspection(inspection);
  }

  async updateLocalFinding(inspectionId: string, finding: Finding): Promise<void> {
    await this.persistenceService.updateCachedFinding(inspectionId, finding);
  }
}
