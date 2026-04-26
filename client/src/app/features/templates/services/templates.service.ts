import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Template, TemplateStructure } from '../models/template.interface';

@Injectable({
  providedIn: 'root'
})
export class TemplatesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/templates`;

  getTemplates(): Observable<Template[]> {
    return this.http.get<Template[]>(this.apiUrl);
  }

  getTemplate(id: string): Observable<Template> {
    return this.http.get<Template>(`${this.apiUrl}/${id}`);
  }

  cloneTemplate(id: string, name: string): Observable<Template> {
    return this.http.post<Template>(`${this.apiUrl}?source_template_id=${id}`, { name });
  }

  createTemplate(name: string): Observable<Template> {
    return this.http.post<Template>(this.apiUrl, { name });
  }

  updateTemplate(id: string, structure: TemplateStructure): Observable<Template> {
    return this.http.patch<Template>(`${this.apiUrl}/${id}`, { structure });
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getIcons(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/icons`);
  }
}
