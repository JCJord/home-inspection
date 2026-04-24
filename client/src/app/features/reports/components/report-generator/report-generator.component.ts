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
    const s = String(severity).toLowerCase();
    switch (s) {
      case 'safety': return '#ef4444';
      case 'major': return '#f97316';
      case 'minor': return '#eab308';
      case 'maintenance': return '#3b82f6';
      default: return '#94a3b8';
    }
  }

  isSeverityLight(severity: string): boolean {
    const s = String(severity).toLowerCase();
    return s === 'minor' || s === 'maintenance';
  }

  getGroupedFindings() {
    if (!this.inspection?.findings) return [];

    const groups: { section: string, findings: any[] }[] = [];

    this.inspection.findings.forEach(finding => {
      let group = groups.find(g => g.section === finding.section);
      if (!group) {
        group = { section: finding.section, findings: [] };
        groups.push(group);
      }
      group.findings.push(finding);
    });

    return groups;
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

    // Pre-process container to embed images for accurate height calculation
    const offScreenContainer = document.querySelector('.off-screen-render') as HTMLElement;
    if (offScreenContainer) {
      await this.embedImages(offScreenContainer);
    }

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

      // No need to call embedImages again here since we did it for the whole container
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
              *, *::before, *::after { box-sizing: border-box; }
              ${styles}
              html, body { 
                  margin: 0; 
                  padding: 0; 
                  width: 1725px; 
                  background-color: white; 
                  -webkit-print-color-adjust: exact;
              }
              .page { 
                  display: block;
                  page-break-after: always !important; 
                  break-after: page !important;
                  width: 1725px;
                  height: 2518px;
                  margin: 0 auto;
                  position: relative;
                  background-color: white;
              }
          </style>
      </head>
      <body>
          ${fullHtmlContent}
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
