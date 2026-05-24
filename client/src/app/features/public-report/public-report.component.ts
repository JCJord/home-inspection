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
    
    // Seed with template sections to ensure empty states render
    const templateSections = this.inspection()?.template_snapshot?.sections || [];
    for (const section of templateSections) {
      groupsMap.set(section.name, []);
    }

    for (const finding of findings) {
      if (!groupsMap.has(finding.section)) {
        groupsMap.set(finding.section, []);
      }
      groupsMap.get(finding.section)?.push(finding);
    }

    const groups: SectionGroup[] = [];
    groupsMap.forEach((items, name) => {
      // Sort findings inside the group by severity (Safety > Major > Minor > Maintenance > Informational)
      const severityOrder: Record<string, number> = {
        'Safety Hazard': 1,
        'Major Defect': 2,
        'Minor Defect': 3,
        'Maintenance Item': 4,
        'Informational Item': 5
      };
      
      items.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));
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

  getSeverityColor(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'safety hazard': return 'bg-red-100 text-red-800';
      case 'major defect': return 'bg-orange-100 text-orange-800';
      case 'minor defect': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance item': return 'bg-green-100 text-green-800';
      case 'informational item': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
