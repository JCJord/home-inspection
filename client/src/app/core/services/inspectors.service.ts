import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Inspector } from '../models/inspector.interface';
import { UpdateProfileDto } from '../dtos/update-profile.dto';

@Injectable({
  providedIn: 'root',
})
export class InspectorsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inspectors`;
  private readonly CACHE_KEY = 'ins_cached_profile';

  // Global Auto-save state
  readonly isSaving = signal<boolean>(false);
  readonly lastSavedAt = signal<Date | null>(null);

  // --- State Store ---
  private _profile = signal<Inspector | null>(null);
  private _needsRefresh = signal<boolean>(true);

  profile = this._profile.asReadonly();

  constructor() {
    this.loadFromCache();
  }

  private loadFromCache(): void {
    const cached = localStorage.getItem(this.CACHE_KEY);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        this._profile.set(data);
      } catch (e) {
        console.warn('Failed to parse cached profile', e);
      }
    }
  }

  private saveToCache(data: Inspector): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
  }

  /**
   * Fetches the profile of the currently logged-in inspector.
   */
  getProfile(forceRefresh: boolean = false): Observable<Inspector> {
    if (!this._needsRefresh() && !forceRefresh && this._profile()) {
      return of(this._profile()!);
    }

    return this.http.get<Inspector>(`${this.apiUrl}/profile`).pipe(
      tap((data) => {
        this._profile.set(data);
        this.saveToCache(data);
        this._needsRefresh.set(false);
      })
    );
  }

  /**
   * Updates the profile of the currently logged-in inspector.
   */
  updateProfile(dto: UpdateProfileDto): Observable<Inspector> {
    return this.http.patch<Inspector>(`${this.apiUrl}/profile`, dto).pipe(
      tap((updated) => {
        this._profile.set(updated);
        this.saveToCache(updated);
        this._needsRefresh.set(true); // Still mark as stale to be safe, but we have local sync
      })
    );
  }

  /**
   * Uploads a new logo for the inspector.
   */
  uploadLogo(file: File): Observable<Inspector> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post<Inspector>(`${this.apiUrl}/profile/logo`, formData).pipe(
      tap((updated) => {
        this._profile.set(updated);
        this.saveToCache(updated);
        this._needsRefresh.set(true);
      })
    );
  }

  /**
   * Clears the cache (e.g., on logout).
   */
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    this._profile.set(null);
    this._needsRefresh.set(true);
  }
}
