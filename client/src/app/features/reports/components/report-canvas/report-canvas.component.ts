import { Component, Input, OnInit, AfterViewInit, HostListener, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inspection } from '../../../../core/models/inspection.interface';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-report-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-canvas.component.html',
  styleUrl: './report-canvas.component.scss'
})
export class ReportCanvasComponent implements OnInit, AfterViewInit {
  private elementRef = inject(ElementRef);

  @Input() inspection: Inspection | null = null;

  today = new Date();
  apiUrl = environment.apiUrl.replace('/api', '');
  
  scale = signal<number>(0.5);
  unscaledHeight = signal<number>(2000); // Placeholder, will be measured

  getSeverityColor(severity: string): string {
    const s = String(severity).toLowerCase();
    switch (s) {
      case 'safety': return '#EF4444';
      case 'major': return '#F97316';
      case 'minor': return '#FEF9C3';
      case 'maintenance': return '#DCFCE7';
      case 'informational': return '#EFF6FF';
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
      case 'informational': return '#1E40AF';
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

    return sections.map(section => {
      const sectionFindings = findings.filter(f => f.section === section.name);
      const processedFindings: any[] = [];
      const status = statuses[section.name] || { status: 'inspected' };

      sectionFindings.forEach(finding => {
        if (finding.photos && finding.photos.length > 12) {
          const photos = finding.photos;
          for (let i = 0; i < photos.length; i += 12) {
            const chunk = photos.slice(i, i + 12);
            const chunkIndex = Math.floor(i / 12);
            processedFindings.push({
              ...finding,
              id: `${finding.id}_chunk_${chunkIndex}`,
              photos: chunk
            });
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
        return 0;
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

  getSectionFields(sectionName: string): any[] {
    if (!this.inspection?.template_snapshot?.sections) return [];
    const section = this.inspection.template_snapshot.sections.find(s => s.name === sectionName);
    return section?.fields || [];
  }

  getSectionMetadata(key: string): string | null {
    return this.inspection?.metadata_values?.[key] || null;
  }

  getCoverPhoto(): string | null {
    if (this.inspection?.cover_photo_url) {
      return this.apiUrl + this.inspection.cover_photo_url;
    }

    if (!this.inspection?.findings) return null;
    const exteriorFinding = this.inspection.findings.find(f => 
      f.section.toLowerCase() === 'exterior' && f.photos.length > 0
    );
    if (exteriorFinding) return this.apiUrl + exteriorFinding.photos[0].storage_url;
    
    const anyPhoto = this.inspection.findings.find(f => f.photos.length > 0);
    if (anyPhoto) return this.apiUrl + anyPhoto.photos[0].storage_url;
    
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

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Dynamic measurement logic
    setTimeout(() => {
      this.updateScale();
    }, 150);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateScale();
  }

  updateScale(): void {
    // Traverse parent nodes to find the scrollable report-preview-content
    let parent = this.elementRef.nativeElement.parentElement;
    let targetWidth = 1750; // Visual base report width

    while (parent) {
      if (parent.classList.contains('report-preview-content')) {
        break;
      }
      parent = parent.parentElement;
    }

    const containerWidth = parent ? parent.clientWidth : window.innerWidth;
    let computedScale = Math.min((containerWidth - 64) / targetWidth, 1);

    // Clamp the scale to the 1100px width threshold (~0.592) when screen size goes below 1100px
    if (containerWidth <= 1100) {
      computedScale = (1100 - 64) / targetWidth;
    }

    this.scale.set(Math.max(computedScale, 0.1)); // Keep scale positive

    // Measure actual unscaled height of the inner main-content element
    const innerContent = this.elementRef.nativeElement.querySelector('.main-content');
    if (innerContent) {
      this.unscaledHeight.set(innerContent.scrollHeight);
    }
  }
}
