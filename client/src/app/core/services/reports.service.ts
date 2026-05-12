import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Inspection } from '../models/inspection.interface';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  generatePdfFromHtml(html: string, productId?: string): Observable<Blob> {
    const payload = { html, productId };
    return this.http.post(`${this.apiUrl}/generate`, payload, { responseType: 'blob' });
  }

  // Deprecated: Moving logic to component for advanced control
  generatePdf(inspection: Inspection): Observable<Blob> {
    return this.generatePdfFromHtml(this.constructReportHtml(inspection));
  }

  private constructReportHtml(inspection: Inspection): string {
    const findingsHtml = (inspection.findings || [])
      .map(
        (f) => `
      <div class="finding">
        <h3>${f.section} - ${f.severity}</h3>
        <p><strong>Location:</strong> ${f.location || 'N/A'}</p>
        <p>${f.description}</p>
        ${f.recommendation ? `<p><strong>Recommendation:</strong> ${f.recommendation}</p>` : ''}
        <div class="photos">
          ${f.photos.map((p) => `<img src="${environment.apiUrl.replace('/api', '')}${p.storage_url}" style="width: 200px; margin: 5px;" />`).join('')}
        </div>
      </div>
    `
      )
      .join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2c3e50; }
            .header { border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 20px; }
            .finding { margin-bottom: 30px; page-break-inside: avoid; }
            .finding h3 { background: #f4f4f4; padding: 5px 10px; }
            .photos { display: flex; flex-wrap: wrap; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Inspection Report</h1>
            <p><strong>Address:</strong> ${inspection.address}</p>
            <p><strong>Client:</strong> ${inspection.client_name}</p>
            <p><strong>Year Built:</strong> ${inspection.year_built}</p>
          </div>
          <div class="findings">
            ${findingsHtml}
          </div>
        </body>
      </html>
    `;
  }
}
