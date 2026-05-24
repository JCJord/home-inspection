import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Template, TemplateStructure } from '../models/template.interface';
import { AuthService } from '../../../core/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TemplatesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/templates`;

  // --- State Store ---
  private _templates = signal<Template[]>([]);
  private _icons = signal<string[]>([]);
  private _needsRefresh = signal<boolean>(true);
  private _isLoading = signal<boolean>(false);
  private _loadedForUserId = signal<string | null>(null);

  templates = this._templates.asReadonly();
  icons = this._icons.asReadonly();
  isLoading = this._isLoading.asReadonly();

  constructor() {
    this._loadedForUserId.set(this.authService.currentUser()?.id || null);
    this.loadFromCache();
  }

  // Cache key scoped to the current user — prevents cross-user data leaks.
  private get cacheKey(): string {
    const user = this.authService.currentUser() as { id: string } | null;
    const userId = user?.id;
    return userId ? `ins_cached_templates_${userId}` : 'ins_cached_templates_anonymous';
  }

  private loadFromCache(): void {
    const cached = localStorage.getItem(this.cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        this._templates.set(data);
      } catch (e) {
        console.warn('Failed to parse cached templates', e);
        this._templates.set([]);
      }
    } else {
      this._templates.set([]); // Clear if no cache exists for new user
    }
  }

  private saveToCache(data: Template[]): void {
    localStorage.setItem(this.cacheKey, JSON.stringify(data));
  }

  getTemplates(forceRefresh: boolean = false): Observable<Template[]> {
    const currentUserId = this.authService.currentUser()?.id || null;
    
    // If the user changed (e.g. logout then login as someone else), clear state and force refresh
    if (this._loadedForUserId() !== currentUserId) {
      this._loadedForUserId.set(currentUserId);
      this._needsRefresh.set(true);
      this.loadFromCache();
    }

    if (!this._needsRefresh() && !forceRefresh && this._templates().length > 0) {
      return of(this._templates());
    }

    this._isLoading.set(this._templates().length === 0);

    return this.http.get<Template[]>(this.apiUrl).pipe(
      tap({
        next: (res) => {
          this._templates.set(res);
          this.saveToCache(res);
          this._isLoading.set(false);
          this._needsRefresh.set(false);
        },
        error: () => this._isLoading.set(false)
      })
    );
  }

  getTemplate(id: string): Observable<Template> {
    return this.http.get<Template>(`${this.apiUrl}/${id}`);
  }

  cloneTemplate(id: string, name: string): Observable<Template> {
    return this.http.post<Template>(`${this.apiUrl}?source_template_id=${id}`, { name }).pipe(
      tap(() => this._needsRefresh.set(true))
    );
  }

  createTemplate(name: string): Observable<Template> {
    return this.http.post<Template>(this.apiUrl, { name }).pipe(
      tap(() => this._needsRefresh.set(true))
    );
  }

  updateTemplate(id: string, structure: TemplateStructure): Observable<Template> {
    return this.http.patch<Template>(`${this.apiUrl}/${id}`, { structure }).pipe(
      tap(() => this._needsRefresh.set(true))
    );
  }

  deleteTemplate(id: string): Observable<void> {
    // Snapshot state for rollback in case of error.
    const snapshot = this._templates();

    // Optimistic update — remove immediately from UI.
    this._templates.update(list => list.filter(t => t.id !== id));
    this.saveToCache(this._templates());
    this._needsRefresh.set(true);

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((err) => {
        // Rollback: restore the snapshot on any error (e.g. 403 for system templates).
        this._templates.set(snapshot);
        this.saveToCache(snapshot);
        this._needsRefresh.set(false);
        return throwError(() => err);
      })
    );
  }

  getIcons(): Observable<string[]> {
    if (this._icons().length > 0) {
      return of(this._icons());
    }
    return this.http.get<string[]>(`${this.apiUrl}/icons`).pipe(
      tap(icons => this._icons.set(icons))
    );
  }
}
