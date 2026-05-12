import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GenerateCommentRequest {
  section: string;
  severity: string;
  location?: string;
  short_note: string;
  year_built: number;
}

export interface GenerateCommentResponse {
  comment: string;
  recommendation: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ai`;

  generateComment(request: GenerateCommentRequest): Observable<GenerateCommentResponse> {
    return this.http.post<GenerateCommentResponse>(`${this.apiUrl}/generate-comment`, request);
  }
}
