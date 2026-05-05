import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Template, TemplateStructure } from '../models/template.interface';

@Injectable({
  providedIn: 'root'
})
export class TemplatesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/templates`;
  private readonly CACHE_KEY = 'ins_cached_templates';

  // --- State Store ---
  private _templates = signal<Template[]>([]);
  private _icons = signal<string[]>([]);
  private _needsRefresh = signal<boolean>(true);
  private _isLoading = signal<boolean>(false);

  templates = this._templates.asReadonly();
  icons = this._icons.asReadonly();
  isLoading = this._isLoading.asReadonly();

  constructor() {
    this.loadFromCache();
  }

  private loadFromCache(): void {
    const cached = localStorage.getItem(this.CACHE_KEY);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        this._templates.set(data);
      } catch (e) {
        console.warn('Failed to parse cached templates', e);
      }
    }
  }

  private saveToCache(data: Template[]): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
  }

  getTemplates(forceRefresh: boolean = false): Observable<Template[]> {
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
    // Optimistic Update
    this._templates.update(list => list.filter(t => t.id !== id));
    this.saveToCache(this._templates());
    this._needsRefresh.set(true);

    return this.http.delete<void>(`${this.apiUrl}/${id}`);
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
