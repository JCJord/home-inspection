import { Component, inject, signal, Input, Output, EventEmitter, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { LucideAngularModule, Loader2, FileText, CheckCircle } from 'lucide-angular';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ReportsService } from '../../../../core/services/reports.service';
import { PdfPaginationHelper } from '../../../../core/helpers/pdf-pagination.helper';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-report-generator',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './report-generator.component.html',
  styleUrl: './report-generator.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ReportGeneratorComponent implements OnInit {
  private http = inject(HttpClient);
  private reportsService = inject(ReportsService);

  @Input() inspection: Inspection | null = null;
  @Output() completed = new EventEmitter<Blob>();
  @Output() error = new EventEmitter<string>();

  isGenerating = signal(false);
  generationProgress = signal(0);
  currentStatus = signal('');
  feedbackMessage = signal('Initializing document engine...');
  contentPartBeingRendered = signal<string | null>(null);
  today = new Date();
  apiUrl = environment.apiUrl.replace('/api', '');

  readonly allContentParts = ['cover', 'overview', 'inspection-findings'];
  readonly icons = { Loader2, FileText, CheckCircle };

  getSeverityColor(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'safety': return '#ef4444'; // Red
      case 'major': return '#f97316';  // Orange
      case 'minor': return '#eab308';  // Yellow
      case 'maintenance': return '#3b82f6'; // Blue
      default: return '#94a3b8'; // Slate
    }
  }

  ngOnInit(): void {
    // Small delay to ensure inputs are resolved and we are off-thread
    setTimeout(() => {
      this.startGeneration();
    }, 100);
  }

  async startGeneration() {
    if (!this.inspection) return;

    this.isGenerating.set(true);
    this.generationProgress.set(0);
    
    try {
      const finalHtml = await this.prepareContentToExport();
      this.currentStatus.set('Finalizing PDF...');
      
      this.reportsService.generatePdfFromHtml(finalHtml).subscribe({
        next: (blob) => {
          this.generationProgress.set(100);
          this.currentStatus.set('Report Ready!');
          setTimeout(() => {
            this.isGenerating.set(false);
            this.completed.emit(blob);
          }, 1000);
        },
        error: (err) => {
          console.error('PDF Generation Error', err);
          this.error.emit('Failed to generate PDF on server.');
          this.isGenerating.set(false);
        }
      });
    } catch (e) {
      console.error('Preparation Error', e);
      this.error.emit('Failed to prepare report content.');
      this.isGenerating.set(false);
    }
  }

  private async prepareContentToExport(): Promise<string> {
    let fullHtmlContent = '';
    const totalParts = this.allContentParts.length;

    for (const [index, part] of this.allContentParts.entries()) {
      this.contentPartBeingRendered.set(part);
      
      const partMessages: Record<string, string> = {
        'cover': 'Crafting cover page...',
        'overview': 'Synthesizing executive summary...',
        'inspection-findings': 'Organizing inspection findings...'
      };
      
      this.feedbackMessage.set(partMessages[part] || 'Rendering content...');
      this.currentStatus.set(`Processing Part ${index + 1} of ${totalParts}`);

      // Allow Angular render cycle
      await new Promise<void>(resolve => setTimeout(resolve, 500));

      const tableElement = document.querySelector('.main-content') as HTMLElement;
      if (!tableElement) continue;

      // Pagination prevention for detail sections
      if (part === 'inspection-findings') {
        const helper = new PdfPaginationHelper();
        helper.preventContentCut();
      }

      await this.embedImages(tableElement);
      fullHtmlContent += tableElement.innerHTML;

      // Update progress (from 10% to 90%)
      const progress = Math.round(10 + (index + 1) / totalParts * 80);
      this.generationProgress.set(progress);
    }

    this.currentStatus.set('Finalizing PDF styles...');
    const fontCss = await this.loadFonts();
    const styles = (await this.getAllStyles()) + fontCss;
    console.log(`Captured ${styles.length} characters of CSS for report.`);

    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <style>
              ${styles}
              @media print {
                  .page { page-break-after: always; }
                  html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: white !important; }
                  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              }
          </style>
      </head>
      <body>
          <div class="main-content">${fullHtmlContent}</div>
      </body>
      </html>
    `;
  }

  private async embedImages(root: HTMLElement) {
    const images = Array.from(root.querySelectorAll('img'));

    for (const img of images) {
      if (img.src.startsWith('data:')) continue;

      try {
        const fetchWithTimeout = (url: string, ms = 10000) =>
          Promise.race([
            fetch(url),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), ms)
            )
          ]);

        const response = await fetchWithTimeout(img.src);
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onloadend = resolve;
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.src = reader.result as string;
      } catch (e) {
        console.warn('Failed to embed image', img.src, e);
      }
    }
  }

  private async getAllStyles(): Promise<string> {
    let styles = '';
    
    // 1. Capture all <style> tags content
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(tag => {
      styles += tag.innerHTML + '\n';
    });

    // 2. Capture all link stylesheets
    const sheets = Array.from(document.styleSheets) as CSSStyleSheet[];
    for (const sheet of sheets) {
      try {
        const rules = Array.from(sheet.cssRules);
        styles += rules.map(rule => rule.cssText).join('\n') + '\n';
      } catch (e) {
        if (sheet.href) {
          try {
            const response = await fetch(sheet.href);
            const cssText = await response.text();
            styles += cssText + '\n';
          } catch (fetchError) {
            console.warn('Failed to fetch:', sheet.href);
          }
        }
      }
    }

    return styles;
  }

  private async loadFonts(): Promise<string> {
    // Here we could load project-specific fonts
    // For now, returning empty or a standard Google Font import if needed
    return '';
  }
}
