import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Inspection, Finding, Photo } from '../models/inspection.interface';
import { CreateInspectionDto } from '../dtos/create-inspection.dto';
import { UpdateInspectionDto } from '../dtos/update-inspection.dto';
import { CreateFindingDto } from '../dtos/create-finding.dto';
import { UpdateFindingDto } from '../dtos/update-finding.dto';
import { ReorderFindingsDto } from '../dtos/reorder-findings.dto';
import { ReorderPhotosDto } from '../dtos/reorder-photos.dto';

@Injectable({
  providedIn: 'root',
})
export class InspectionsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inspections`;
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

  getInspections(page: number = 1, limit: number = 10, forceRefresh: boolean = false): Observable<{ data: Inspection[], meta: { total: number, page: number, limit: number, totalPages: number } }> {
    // Return cached data if not stale and not forced
    if (!this._needsRefresh() && !forceRefresh && this._inspections().length > 0 && page === 1) {
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

    // Only show loading spinner if we have no data at all
    if (this._inspections().length === 0) {
      this._isLoading.set(true);
    }

    return this.http.get<{ data: Inspection[], meta: { total: number, page: number, limit: number, totalPages: number } }>(this.apiUrl, { params }).pipe(
      tap({
        next: (res) => {
          this._inspections.set(res.data);
          this._totalCount.set(res.meta.total);
          if (page === 1) {
            this.saveToCache(res.data, res.meta.total);
          }
          this._isLoading.set(false);
          this._needsRefresh.set(false); // Reset flag on success
        },
        error: () => this._isLoading.set(false)
      })
    );
  }

  getInspectionById(id: string): Observable<Inspection> {
    return this.http.get<Inspection>(`${this.apiUrl}/${id}`);
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
    return this.http.post<Inspection>(`${this.apiUrl}/${id}/publish`, {});
  }

  unpublishInspection(id: string): Observable<Inspection> {
    return this.http.post<Inspection>(`${this.apiUrl}/${id}/unpublish`, {});
  }

  updatePhoto(inspectionId: string, findingId: string, photoId: string, dto: { caption: string }): Observable<Photo> {
    return this.http.patch<Photo>(`${this.apiUrl}/${inspectionId}/findings/${findingId}/photos/${photoId}`, dto);
  }

  uploadCoverPhoto(id: string, file: File): Observable<Inspection> {
    const formData = new FormData();
    formData.append('cover_photo', file);
    return this.http.post<Inspection>(`${this.apiUrl}/${id}/cover-photo`, formData);
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
}
