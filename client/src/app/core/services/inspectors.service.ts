import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Inspector } from '../models/inspector.interface';
import { UpdateProfileDto } from '../dtos/update-profile.dto';

@Injectable({
  providedIn: 'root',
})
export class InspectorsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inspectors`;

  // Global Auto-save state
  readonly isSaving = signal<boolean>(false);
  readonly lastSavedAt = signal<Date | null>(null);

  /**
   * Fetches the profile of the currently logged-in inspector.
   */
  getProfile(): Observable<Inspector> {
    return this.http.get<Inspector>(`${this.apiUrl}/profile`);
  }

  /**
   * Updates the profile of the currently logged-in inspector.
   */
  updateProfile(dto: UpdateProfileDto): Observable<Inspector> {
    return this.http.patch<Inspector>(`${this.apiUrl}/profile`, dto);
  }

  /**
   * Uploads a new logo for the inspector.
   */
  uploadLogo(file: File): Observable<Inspector> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<Inspector>(`${this.apiUrl}/profile/logo`, formData);
  }
}
