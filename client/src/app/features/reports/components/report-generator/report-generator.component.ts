import { Component, inject, signal, Input, Output, EventEmitter, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { LucideAngularModule, Loader2, FileText, CheckCircle } from 'lucide-angular';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ReportsService } from '../../../../core/services/reports.service';
import { ImageCacheService } from '../../../../core/services/image-cache.service';
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
  private imageCacheService = inject(ImageCacheService);

  @Input() inspection: Inspection | null = null;
  @Input() mode: 'download' | 'publish' = 'download';
  @Output() completed = new EventEmitter<Blob>();
  @Output() error = new EventEmitter<string>();
  @Output() htmlReady = new EventEmitter<string>();
  @Output() progress = new EventEmitter<{ progress: number, message: string }>();

  isGenerating = signal(false);
  generationProgress = signal(0);
  currentStatus = signal('');
  feedbackMessage = signal('Initializing document engine...');
  contentPartBeingRendered = signal<string | null>(null);
  today = new Date();
  apiUrl = environment.apiUrl.replace('/api', '');

  readonly allContentParts = ['cover', 'table-of-contents', 'executive-summary', 'legal-shield', 'general-info', 'inspection-findings', 'signature'];
  readonly icons = { Loader2, FileText, CheckCircle };

  getSeverityColor(severity: string): string {
    const s = String(severity).toLowerCase();
    switch (s) {
      case 'safety': return '#EF4444';
      case 'major': return '#F97316';
      case 'minor': return '#FEF9C3';
      case 'maintenance': return '#DCFCE7';
      case 'informational': return '#EFF6FF'; // Tailwind blue-50
      default: return '#F3F4F6';
    }
  }

  getSeverityTextColor(severity: string): string {
    const s = String(severity).toLowerCase();
    switch (s) {
      case 'safety': return '#FFFFFF';
      case 'major': return '#FFFFFF';
      case 'minor': return '#854D0E';
      case 'maintenance': return '#166534';
      case 'informational': return '#1E40AF'; // Tailwind blue-800
      default: return '#4B5563';
    }
  }

  isSeverityLight(severity: string): boolean {
    const s = String(severity).toLowerCase();
    return s === 'minor' || s === 'maintenance';
  }


  getGroupedFindings() {
    if (!this.inspection?.template_snapshot?.sections) return [];

    const findings = this.inspection.findings || [];
    const sections = this.inspection.template_snapshot.sections;
    const statuses = this.inspection.section_statuses || {};

    return sections
      .filter(section => section.name !== 'Building Specifications')
      .map(section => {
      const sectionFindings = findings.filter(f => f.section === section.name);
      const processedFindings: any[] = [];
      const status = statuses[section.name] || { status: 'inspected' };

      sectionFindings.forEach(finding => {
        if (finding.photos && finding.photos.length > 2) {
          const photos = finding.photos;
          for (let i = 0; i < photos.length; i += 2) {
            const chunk = photos.slice(i, i + 2);
            const chunkIndex = Math.floor(i / 2);
            
            if (chunkIndex === 0) {
              processedFindings.push({
                ...finding,
                id: `${finding.id}_chunk_${chunkIndex}`,
                photos: chunk
              });
            } else {
              // Continuation chunk: minimal info to avoid repeating long descriptions/recommendations
              processedFindings.push({
                ...finding,
                id: `${finding.id}_chunk_${chunkIndex}`,
                description: '',
                recommendation: '',
                photos: chunk
              });
            }
          }
        } else {
          processedFindings.push(finding);
        }
      });

      // Sort findings to ensure Informational ones appear at the end
      processedFindings.sort((a, b) => {
        const isAInfo = String(a.severity).toLowerCase() === 'informational';
        const isBInfo = String(b.severity).toLowerCase() === 'informational';
        if (isAInfo && !isBInfo) return 1;
        if (!isAInfo && isBInfo) return -1;
        return 0; // maintain original order otherwise
      });



      return {
        section: section.name,
        findings: processedFindings,
        status: status.status,
        reason: status.reason
      };
    });
  }

  getSevereFindings() {
    if (!this.inspection?.findings) return [];
    return this.inspection.findings.filter(f => 
      f.severity.toLowerCase() === 'safety' || 
      f.severity.toLowerCase() === 'major'
    );
  }

  getGroupedSevereFindings() {
    const severeFindings = this.getSevereFindings();
    const grouped = new Map<string, any[]>();
    
    severeFindings.forEach(finding => {
      if (!grouped.has(finding.section)) {
        grouped.set(finding.section, []);
      }
      grouped.get(finding.section)?.push(finding);
    });

    return Array.from(grouped.entries()).map(([section, findings]) => ({
      section,
      findings
    }));
  }

  getSectionFields(sectionName: string): any[] {
    if (!this.inspection?.template_snapshot?.sections) return [];
    const section = this.inspection.template_snapshot.sections.find(s => s.name === sectionName);
    return section?.fields || [];
  }

  getSectionMetadata(key: string): string | null {
    return this.inspection?.metadata_values?.[key] || null;
  }

  getAbsoluteImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    return url.startsWith('http') ? url : `${this.apiUrl}${url}`;
  }

  getCoverPhoto(): string | null {
    if (this.inspection?.cover_photo_url) {
      return this.getAbsoluteImageUrl(this.inspection.cover_photo_url);
    }

    if (!this.inspection?.findings) return null;
    // Look for an exterior photo first
    const exteriorFinding = this.inspection.findings.find(f => 
      f.section.toLowerCase() === 'exterior' && f.photos.length > 0
    );
    if (exteriorFinding) return this.getAbsoluteImageUrl(exteriorFinding.photos[0].storage_url);
    
    // Otherwise just the first photo found
    const anyPhoto = this.inspection.findings.find(f => f.photos.length > 0);
    if (anyPhoto) return this.getAbsoluteImageUrl(anyPhoto.photos[0].storage_url);
    
    return null;
  }

  getLogoUrl(url?: string): string {
    if (!url) return 'https://i.ibb.co/VcHybzvY/inspectly-logo.png';
    return url.startsWith('http') ? url : `${this.apiUrl}${url}`;
  }

  splitNoteIntoParagraphs(note: string): string[] {
    if (!note) return [];
    return note.split('\n').filter(p => p.trim().length > 0);
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
    this.progress.emit({ progress: 0, message: 'Initializing document engine...' });

    try {
      console.log('[DEBUG] Starting prepareContentToExport');
      const finalHtml = await this.prepareContentToExport();
      console.log('[DEBUG] Finished prepareContentToExport, length:', finalHtml.length);

      if (this.mode === 'publish') {
        this.generationProgress.set(100);
        this.currentStatus.set('HTML Compiled!');
        this.progress.emit({ progress: 100, message: 'HTML Compiled!' });
        setTimeout(() => {
          this.isGenerating.set(false);
          this.htmlReady.emit(finalHtml);
        }, 300);
        return;
      }

      this.currentStatus.set('Finalizing PDF...');
      this.progress.emit({ progress: 95, message: 'Finalizing PDF on cloud...' });
      console.log('[DEBUG] Calling reportsService.generatePdfFromHtml');

      this.reportsService.generatePdfFromHtml(finalHtml, this.inspection?.id).subscribe({

        next: (blob) => {
          this.generationProgress.set(100);
          this.currentStatus.set('Report Ready!');
          this.progress.emit({ progress: 100, message: 'Report Ready!' });
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
      console.log(`[DEBUG] Processing part: ${part} (${index + 1}/${totalParts})`);
      this.contentPartBeingRendered.set(part);

      const partMessages: Record<string, string> = {
        'cover': 'Crafting high-fidelity cover page...',
        'table-of-contents': 'Building document index...',
        'executive-summary': 'Identifying critical safety hazards...',
        'legal-shield': 'Injecting compliance & legal boilerplate...',
        'general-info': 'Synthesizing property conditions...',
        'inspection-findings': 'Organizing detailed findings...'
      };

      this.feedbackMessage.set(partMessages[part] || 'Rendering content...');
      this.currentStatus.set(`Processing Part ${index + 1} of ${totalParts}`);
      this.progress.emit({ progress: Math.round(10 + index / totalParts * 80), message: this.feedbackMessage() });

      // Allow Angular render cycle and embed images
      await new Promise<void>(resolve => setTimeout(resolve, 600));
      try {
        await (document as any).fonts?.ready;
      } catch (e) {
        console.warn('Font loading check skipped/failed', e);
      }
      
      const tableElement = document.querySelector('.main-content') as HTMLElement;
      if (!tableElement) {
        console.log(`[DEBUG] No .main-content found for part: ${part}`);
        continue;
      }

      console.log(`[DEBUG] Embedding images for part: ${part}`);
      await this.embedImages(tableElement);
      console.log(`[DEBUG] Finished embedding images for part: ${part}`);

      if (document.querySelector('.snippet')) {
        const helper = new PdfPaginationHelper();
        helper.preventContentCut();
      }

      // No need to call embedImages again here since we did it for the whole container
      fullHtmlContent += tableElement.innerHTML;

      // Update progress (from 10% to 90%)
      const progress = Math.round(10 + (index + 1) / totalParts * 80);
      this.generationProgress.set(progress);
      this.progress.emit({ progress, message: this.feedbackMessage() });
    }

    this.currentStatus.set('Finalizing PDF styles...');
    console.log('[DEBUG] Starting getAllStyles()');
    const fontCss = await this.loadFonts();
    const styles = (await this.getAllStyles()) + fontCss;
    console.log(`[DEBUG] Finished getAllStyles(). Captured ${styles.length} characters of CSS for report.`);

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
                  width: 1750px; 
                  background-color: white; 
                  -webkit-print-color-adjust: exact;
              }
              .page { 
                  display: block;
                  page-break-after: always !important; 
                  break-after: page !important;
                  width: 1750px;
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
      if (img.src.startsWith('http://') || img.src.startsWith('https://')) continue;

      try {
        // Resolve URL using the ImageCacheService (returns local blob URL if cached in IndexedDB)
        const resolvedUrl = await this.imageCacheService.getImageUrl(img.src);

        const fetchWithTimeout = (url: string, ms = 10000) => {
          let timeoutId: any;
          return Promise.race([
            fetch(url).then(res => { clearTimeout(timeoutId); return res; }).catch(err => { clearTimeout(timeoutId); throw err; }),
            new Promise<never>((_, reject) =>
              timeoutId = setTimeout(() => reject(new Error('timeout')), ms)
            )
          ]);
        };

        console.log(`[DEBUG] Fetching image: ${resolvedUrl}`);
        const response = await fetchWithTimeout(resolvedUrl);
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
            console.log(`[DEBUG] Fetching stylesheet: ${sheet.href}`);
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
