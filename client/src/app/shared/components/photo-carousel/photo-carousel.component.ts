import { Component, ElementRef, ViewChild, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-photo-carousel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './photo-carousel.component.html',
  styleUrl: './photo-carousel.component.scss'
})
export class PhotoCarouselComponent {
  images = input.required<string[]>();
  
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  activeIndex = signal(0);
  
  // Drag states
  isDragging = false;
  isMouseDown = false;
  startX = 0;
  scrollLeftPos = 0;
  
  readonly icons = { ChevronLeft, ChevronRight };

  hasImages = computed(() => this.images().length > 0);
  isMultiple = computed(() => this.images().length > 1);

  onScroll(event: Event) {
    const container = event.target as HTMLDivElement;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    // Calculate index based on scroll position
    const newIndex = Math.round(scrollLeft / width);
    if (this.activeIndex() !== newIndex) {
      this.activeIndex.set(newIndex);
    }
  }

  onMouseDown(e: MouseEvent) {
    if (!this.scrollContainer) return;
    this.isMouseDown = true;
    this.isDragging = false;
    this.startX = e.pageX - this.scrollContainer.nativeElement.offsetLeft;
    this.scrollLeftPos = this.scrollContainer.nativeElement.scrollLeft;
  }

  onMouseLeave() {
    this.isMouseDown = false;
    this.isDragging = false;
  }

  onMouseUp() {
    this.isMouseDown = false;
    setTimeout(() => {
      this.isDragging = false;
    }, 50);
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isMouseDown || !this.scrollContainer) return;
    
    const x = e.pageX - this.scrollContainer.nativeElement.offsetLeft;
    
    if (Math.abs(x - this.startX) > 5) {
      this.isDragging = true;
      e.preventDefault();
      const walk = (x - this.startX) * 2;
      this.scrollContainer.nativeElement.scrollLeft = this.scrollLeftPos - walk;
    }
  }

  scrollTo(index: number) {
    if (!this.scrollContainer) return;
    const container = this.scrollContainer.nativeElement;
    const width = container.clientWidth;
    container.scrollTo({
      left: width * index,
      behavior: 'smooth'
    });
    this.activeIndex.set(index);
  }

  next() {
    if (this.activeIndex() < this.images().length - 1) {
      this.scrollTo(this.activeIndex() + 1);
    }
  }

  prev() {
    if (this.activeIndex() > 0) {
      this.scrollTo(this.activeIndex() - 1);
    }
  }
}
