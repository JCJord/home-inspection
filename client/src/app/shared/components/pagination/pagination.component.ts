import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss'
})
export class PaginationComponent {
  currentPage = input.required<number>();
  totalItems = input.required<number>();
  itemsPerPage = input<number>(10);

  pageChanged = output<number>();

  readonly icons = { ChevronLeft, ChevronRight };

  totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.totalItems() / this.itemsPerPage()));
  });

  pages = computed(() => {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  });

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    
    if (total <= 5) return this.pages();
    
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(total, current + 2);
    
    if (current <= 3) {
      endPage = 5;
    } else if (current + 2 >= total) {
      startPage = total - 4;
    }
    
    const visible = [];
    for (let i = startPage; i <= endPage; i++) {
      visible.push(i);
    }
    return visible;
  });

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChanged.emit(page);
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.onPageChange(this.currentPage() - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.onPageChange(this.currentPage() + 1);
    }
  }
}
