import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Inspection } from '../models/inspection.interface';

@Injectable({
  providedIn: 'root'
})
export class PublicReportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/public-reports`;

  getPublicReport(id: string): Observable<Inspection> {
    return this.http.get<Inspection>(`${this.apiUrl}/${id}`);
  }
}
