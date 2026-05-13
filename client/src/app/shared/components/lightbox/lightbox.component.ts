import { Component, Input, Output, EventEmitter, HostListener, signal, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, ChevronLeft, ChevronRight } from 'lucide-angular';
import { ResolveImagePipe } from '../../pipes/resolve-image.pipe';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ResolveImagePipe],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity"
         (click)="close.emit()">

      <div class="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <span class="text-white/80 font-bold text-sm tracking-widest pointer-events-auto bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
          {{ currentIndex() + 1 }} / {{ images.length }}
        </span>
        
        <button class="p-2 rounded-full bg-black/30 hover:bg-white/20 text-white transition-colors pointer-events-auto backdrop-blur-sm border border-white/10 cursor-pointer"
                (click)="close.emit(); $event.stopPropagation()">
          <lucide-icon [name]="icons.X" [size]="24"></lucide-icon>
        </button>
      </div>

      <div class="relative w-full h-full flex items-center justify-center pointer-events-none p-4 md:p-12">
        <img [src]="images[currentIndex()] | resolveImage | async"
             class="max-h-full max-w-full object-contain drop-shadow-2xl rounded-md pointer-events-auto"
             (click)="$event.stopPropagation()"
             alt="Inspection evidence" />
      </div>

      @if (images.length > 1) {
        <button class="absolute left-2 md:left-6 p-3 rounded-full bg-black/40 hover:bg-black/80 text-white transition-all transform hover:scale-110 border border-white/10 backdrop-blur-sm cursor-pointer"
                [class.opacity-30]="currentIndex() === 0"
                [disabled]="currentIndex() === 0"
                (click)="previous(); $event.stopPropagation()">
          <lucide-icon [name]="icons.ChevronLeft" [size]="32"></lucide-icon>
        </button>

        <button class="absolute right-2 md:right-6 p-3 rounded-full bg-black/40 hover:bg-black/80 text-white transition-all transform hover:scale-110 border border-white/10 backdrop-blur-sm cursor-pointer"
                [class.opacity-30]="currentIndex() === images.length - 1"
                [disabled]="currentIndex() === images.length - 1"
                (click)="next(); $event.stopPropagation()">
          <lucide-icon [name]="icons.ChevronRight" [size]="32"></lucide-icon>
        </button>
      }
    </div>
  `
})
export class LightboxComponent implements OnInit {
  @Input({ required: true }) images!: string[];

  constructor(private el: ElementRef) {}

  ngOnInit() {
    document.body.appendChild(this.el.nativeElement);
  }
  
  // Intercept the starting index to set our signal
  @Input() set startingIndex(val: number) {
    this.currentIndex.set(val);
  }
  
  @Output() close = new EventEmitter<void>();

  currentIndex = signal(0);
  readonly icons = { X, ChevronLeft, ChevronRight };

  // Hardware Keyboard Support
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') this.close.emit();
    if (event.key === 'ArrowRight') this.next();
    if (event.key === 'ArrowLeft') this.previous();
  }

  next() {
    if (this.currentIndex() < this.images.length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  previous() {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }
}
