import { Component, OnInit, signal, computed, inject, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronRight, FileText, Download, LockOpen, Check, Maximize, AlertCircle, Loader2, ChevronDown, Trash2, MoreHorizontal } from 'lucide-angular';
import { InspectionsService } from '../../../../core/services/inspections.service';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { SearchInputComponent } from '../../../../shared/components/inputs/search-input/search-input.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    LucideAngularModule,
    ButtonComponent,
    SkeletonComponent,
    SearchInputComponent
  ],
  templateUrl: './reports-list.component.html',
  styleUrl: './reports-list.component.scss'
})
export class ReportsListComponent implements OnInit {
  private inspectionsService = inject(InspectionsService);
  private elementRef = inject(ElementRef);

  inspections = signal<Inspection[]>([]);
  isLoading = signal<boolean>(true);
  searchQuery = signal<string>('');
  activeMenuId = signal<string | null>(null);
  openUpwards = signal<boolean>(false);
  copyingId = signal<string | null>(null);
  copiedId = signal<string | null>(null);

  readonly icons = {
    ChevronRight,
    FileText,
    Download,
    LockOpen,
    Check,
    Maximize,
    AlertCircle,
    Loader2,
    ChevronDown,
    Trash2,
    MoreHorizontal
  };

  readonly apiUrl = environment.apiUrl.replace('/api', '');

  ngOnInit(): void {
    this.fetchInspections();
  }

  fetchInspections(): void {
    this.isLoading.set(true);
    // Fetch inspections with forceRefresh true to get fresh PDF URL states from NestJS
    this.inspectionsService.getInspections(1, 100, true).subscribe({
      next: (res) => {
        this.inspections.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load inspections', err);
        this.isLoading.set(false);
      }
    });
  }

  publishedReports = computed(() => {
    return this.inspections().filter(i => i.status === 'published');
  });

  filteredReports = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const reportsList = this.publishedReports();
    if (!query) return reportsList;

    return reportsList.filter(i => 
      (i.address?.toLowerCase().includes(query)) ||
      (i.client_name?.toLowerCase().includes(query)) ||
      (i.scheduled_date?.toLowerCase().includes(query))
    );
  });

  metrics = computed(() => {
    const list = this.publishedReports();
    return {
      totalPublished: list.length,
      activePublicLinks: list.length
    };
  });

  toggleActionsMenu(event: Event, id: string): void {
    event.stopPropagation();
    if (this.activeMenuId() === id) {
      this.activeMenuId.set(null);
    } else {
      this.activeMenuId.set(id);
      
      const buttonElement = event.currentTarget as HTMLElement;
      const buttonRect = buttonElement.getBoundingClientRect();
      const estimatedDropdownHeight = 150; // 3 items + 1 divider + padding
      
      const scrollParent = this.getScrollParent(buttonElement);
      
      let spaceBelow: number;
      let spaceAbove: number;

      if (scrollParent === window) {
        spaceBelow = window.innerHeight - buttonRect.bottom;
        spaceAbove = buttonRect.top;
      } else {
        const parentRect = (scrollParent as HTMLElement).getBoundingClientRect();
        spaceBelow = parentRect.bottom - buttonRect.bottom;
        spaceAbove = buttonRect.top - parentRect.top;
      }

      this.openUpwards.set(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow);
    }
  }

  private getScrollParent(node: HTMLElement | null): HTMLElement | Window {
    if (node == null || node.tagName === 'HTML' || node.tagName === 'BODY') {
      return window;
    }

    const style = window.getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(style.overflow + style.overflowY + style.overflowX)) {
      return node;
    }

    return this.getScrollParent(node.parentElement);
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: EventTarget | null) {
    if (!targetElement) return;
    const clickedInside = this.elementRef.nativeElement.contains(targetElement as Node);
    if (!clickedInside) {
      this.activeMenuId.set(null);
    }
  }

  copyReportLink(report: Inspection): void {
    if (!report.id) return;
    
    const fullUrl = `${window.location.origin}/uploads/reports/${report.id}.pdf`;
    this.copyingId.set(report.id);
    
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.copiedId.set(report.id);
      setTimeout(() => {
        if (this.copiedId() === report.id) {
          this.copiedId.set(null);
        }
        if (this.copyingId() === report.id) {
          this.copyingId.set(null);
        }
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy link', err);
      this.copyingId.set(null);
    });
  }

  downloadPublishedReport(report: Inspection): void {
    if (!report.id) return;

    const fileUrl = `${this.apiUrl}/uploads/reports/${report.id}.pdf`;
    const safeAddress = report.address || 'Inspection';
    const filename = `Report-${safeAddress.replace(/ /g, '_')}.pdf`;

    fetch(fileUrl)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Failed to download report', err);
        window.open(fileUrl, '_blank');
      });
  }

  unpublishInspection(report: Inspection): void {
    if (!report.id) return;

    this.isLoading.set(true);
    this.inspectionsService.unpublishInspection(report.id).subscribe({
      next: (updated) => {
        // Update local signal list reactively
        this.inspections.update(list => list.map(i => i.id === report.id ? updated : i));
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to unpublish inspection', err);
        this.isLoading.set(false);
      }
    });
  }
}
