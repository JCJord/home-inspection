import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  // --- Inspection Methods ---

  getInspections(page: number = 1, limit: number = 10): Observable<{ data: Inspection[], meta: { total: number, page: number, limit: number, totalPages: number } }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<{ data: Inspection[], meta: { total: number, page: number, limit: number, totalPages: number } }>(this.apiUrl, { params });
  }

  getInspectionById(id: string): Observable<Inspection> {
    return this.http.get<Inspection>(`${this.apiUrl}/${id}`);
  }

  createInspection(dto: CreateInspectionDto): Observable<Inspection> {
    return this.http.post<Inspection>(this.apiUrl, dto);
  }

  updateInspection(id: string, dto: UpdateInspectionDto): Observable<Inspection> {
    return this.http.patch<Inspection>(`${this.apiUrl}/${id}`, dto);
  }

  deleteInspection(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  publishInspection(id: string): Observable<Inspection> {
    return this.http.post<Inspection>(`${this.apiUrl}/${id}/publish`, {});
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

  uploadPhoto(inspectionId: string, findingId: string, file: File): Observable<Photo> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post<Photo>(`${this.apiUrl}/${inspectionId}/findings/${findingId}/photos`, formData);
  }

  deletePhoto(inspectionId: string, findingId: string, photoId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${inspectionId}/findings/${findingId}/photos/${photoId}`);
  }

  reorderPhotos(inspectionId: string, findingId: string, dto: ReorderPhotosDto): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${inspectionId}/findings/${findingId}/photos/reorder`, dto);
  }
}
