import { Component, inject, OnInit, OnDestroy, AfterViewInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Menu, X, Check, Calendar, Users, Home, Image as ImageIcon, Download, ChevronLeft, ChevronRight } from 'lucide-angular';
import { ActivatedRoute } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { PublicReportService } from '../../core/services/public-report.service';
import { Inspection, Finding } from '../../core/models/inspection.interface';
import { environment } from '../../../environments/environment';

interface SectionGroup {
  name: string;
  findings: Finding[];
}

@Component({
  selector: 'app-public-report',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './public-report.component.html',
  styleUrls: ['./public-report.component.scss']
})
export class PublicReportComponent implements OnInit, OnDestroy, AfterViewInit {
  private route = inject(ActivatedRoute);
  private publicReportService = inject(PublicReportService);
  private title = inject(Title);
  private meta = inject(Meta);

  inspection = signal<Inspection | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  groupedFindings = signal<SectionGroup[]>([]);

  isMobileMenuOpen = signal<boolean>(false);
  activeSection = signal<string>('');
  private observer: IntersectionObserver | null = null;

  // Lightbox State
  lightboxOpen = signal<boolean>(false);
  lightboxPhotos = signal<{url: string, caption?: string}[]>([]);
  lightboxCurrentIndex = signal<number>(0);

  readonly icons = { Menu, X, Check, Calendar, Users, Home, Image: ImageIcon, Download, ChevronLeft, ChevronRight };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Invalid Report ID');
      this.isLoading.set(false);
      return;
    }

    this.publicReportService.getPublicReport(id).subscribe({
      next: (data) => {
        this.inspection.set(data);
        this.setMetaData(data);
        this.groupFindings(data.findings || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load public report:', err);
        this.error.set('Report not found or is not currently published.');
        this.isLoading.set(false);
      }
    });
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.find(entry => entry.isIntersecting);
        if (intersecting) {
          const id = intersecting.target.id;
          if (id.startsWith('section-')) {
            const sectionName = id.replace('section-', '');
            this.activeSection.set(sectionName);
          }
        }
      },
      {
        rootMargin: '-100px 0px -60% 0px'
      }
    );

    setTimeout(() => {
      const sectionElements = document.querySelectorAll('.finding-section-container');
      sectionElements.forEach(el => this.observer?.observe(el));
      
      if (!this.activeSection() && sectionElements.length > 0) {
        const firstId = sectionElements[0].id.replace('section-', '');
        this.activeSection.set(firstId);
      }
    }, 500);
  }

  scrollToSection(sectionName: string) {
    this.isMobileMenuOpen.set(false);
    this.activeSection.set(sectionName);
    
    setTimeout(() => {
      const element = document.getElementById(`section-${sectionName}`);
      if (element) {
        const yOffset = -80; // Account for sticky header
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 50);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  // --- Executive Summary & Metadata Helpers ---

  getSevereFindings(): Finding[] {
    const inspection = this.inspection();
    if (!inspection?.findings) return [];
    return inspection.findings.filter(f => 
      f.severity?.toLowerCase().includes('safety') || 
      f.severity?.toLowerCase().includes('major')
    );
  }

  getSectionFields(sectionName: string): any[] {
    const inspection = this.inspection();
    if (!inspection?.template_snapshot?.sections) return [];
    const section = inspection.template_snapshot.sections.find((s: any) => s.name === sectionName);
    return section?.fields || [];
  }

  hasSectionMetadata(sectionName: string): boolean {
    const fields = this.getSectionFields(sectionName);
    if (!fields.length) return false;
    return fields.some(field => !!this.getSectionMetadata(field.key));
  }

  getSectionMetadata(key: string): string | null {
    const inspection = this.inspection();
    return inspection?.metadata_values?.[key] || null;
  }

  getSectionStatus(sectionName: string): { status: string, reason?: string } {
    const inspection = this.inspection();
    const statusObj = inspection?.section_statuses?.[sectionName];
    return statusObj || { status: 'inspected' };
  }

  splitNoteIntoParagraphs(note: string): string[] {
    if (!note) return [];
    return note.split('\n').filter(p => p.trim().length > 0);
  }

  // --- Lightbox Logic ---

  openLightbox(photos: any[], startIndex: number) {
    if (!photos || photos.length === 0) return;
    this.lightboxPhotos.set(photos.map(p => ({ 
      url: this.getAbsoluteImageUrl(p.storage_url),
      caption: p.caption
    })));
    this.lightboxCurrentIndex.set(startIndex);
    this.lightboxOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.lightboxOpen.set(false);
    document.body.style.overflow = '';
  }

  nextPhoto() {
    const current = this.lightboxCurrentIndex();
    if (current < this.lightboxPhotos().length - 1) {
      this.lightboxCurrentIndex.set(current + 1);
    }
  }

  prevPhoto() {
    const current = this.lightboxCurrentIndex();
    if (current > 0) {
      this.lightboxCurrentIndex.set(current - 1);
    }
  }

  scrollStrip(element: HTMLElement, amount: number) {
    if (element) {
      element.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.lightboxOpen()) return;
    if (event.key === 'Escape') this.closeLightbox();
    if (event.key === 'ArrowRight') this.nextPhoto();
    if (event.key === 'ArrowLeft') this.prevPhoto();
  }

  private setMetaData(inspection: Inspection) {
    const propertyAddress = inspection.address || 'Property';
    const reportTitle = `${propertyAddress} - Inspection Report`;
    const inspectorName = inspection.inspector?.name || 'Inspector';
    const companyName = inspection.inspector?.company_name || 'Inspection Company';
    const reportDesc = `Home inspection report by ${inspectorName} from ${companyName}.`;

    this.title.setTitle(reportTitle);
    this.meta.updateTag({ property: 'og:title', content: reportTitle });
    this.meta.updateTag({ property: 'og:description', content: reportDesc });

    if (inspection.cover_photo_url) {
      const coverUrl = inspection.cover_photo_url.startsWith('http') 
        ? inspection.cover_photo_url 
        : `${environment.apiUrl}${inspection.cover_photo_url}`;
      this.meta.updateTag({ property: 'og:image', content: coverUrl });
    }
  }

  private groupFindings(findings: Finding[]) {
    const groupsMap = new Map<string, Finding[]>();
    
    // Seed with template sections to ensure empty states render (excluding Building Specifications)
    const templateSections = (this.inspection()?.template_snapshot?.sections || [])
      .filter((s: any) => s.name !== 'Building Specifications');
      
    for (const section of templateSections) {
      groupsMap.set(section.name, []);
    }

    for (const finding of findings) {
      if (finding.section === 'Building Specifications') continue;
      if (!groupsMap.has(finding.section)) {
        groupsMap.set(finding.section, []);
      }
      groupsMap.get(finding.section)?.push(finding);
    }

    const groups: SectionGroup[] = [];
    const getSeverityScore = (sev: string): number => {
      const s = sev?.toLowerCase() || '';
      if (s.includes('safety')) return 1;
      if (s.includes('major')) return 2;
      if (s.includes('minor')) return 3;
      if (s.includes('maintenance')) return 4;
      if (s.includes('informational') || s.includes('information')) return 5;
      return 99;
    };

    groupsMap.forEach((items, name) => {
      // Sort findings inside the group by severity
      items.sort((a, b) => getSeverityScore(a.severity) - getSeverityScore(b.severity));
      groups.push({ name, findings: items });
    });

    // Sort groups to match template order if possible, else alphabetical
    groups.sort((a, b) => {
      const idxA = templateSections.findIndex((s: any) => s.name === a.name);
      const idxB = templateSections.findIndex((s: any) => s.name === b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.name.localeCompare(b.name);
    });
    
    this.groupedFindings.set(groups);
  }

  getAbsoluteImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    return url.startsWith('http') ? url : `${environment.apiUrl}${url}`;
  }

  getSeverityStyles(severity: string) {
    const s = severity?.toLowerCase().trim() || '';
    if (s.includes('safety')) return { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' };
    if (s.includes('major')) return { bg: '#FFEDD5', text: '#9A3412', border: '#F97316' };
    if (s.includes('minor')) return { bg: '#FEF9C3', text: '#854D0E', border: '#EAB308' };
    if (s.includes('maintenance')) return { bg: '#DCFCE7', text: '#166534', border: '#22C55E' };
    if (s.includes('informational') || s.includes('information')) return { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' };
    return { bg: '#F3F4F6', text: '#1F2937', border: '#9CA3AF' };
  }

  getPdfUrl(): string | null {
    const insp = this.inspection();
    if (!insp) return null;
    
    if (insp.report?.pdf_url) {
      return this.getAbsoluteImageUrl(insp.report.pdf_url);
    }
    
    // Fallback for locally generated PDFs if report.pdf_url is missing
    return this.getAbsoluteImageUrl(`/uploads/reports/${insp.id}.pdf`);
  }
}
