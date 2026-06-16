import { Component, Input, Output, EventEmitter, HostListener, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, ChevronLeft, ChevronRight, Maximize, Shield } from 'lucide-angular';
import { ButtonComponent } from '../button/button.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent, RouterModule],
  template: `
    <div class="fixed inset-0 z-[100] flex flex-col bg-slate-900/95 backdrop-blur-md" 
         (click)="onBackdropClick($event)">
      
      <!-- Top Bar -->
      <div class="flex items-center justify-between p-4 bg-gradient-to-b from-slate-900/80 to-transparent pointer-events-none absolute top-0 w-full z-10">
        <div class="text-white font-semibold text-sm px-3 py-1.5 bg-slate-800/50 rounded-full backdrop-blur-sm pointer-events-auto shadow-sm">
          Page {{ currentIndex() + 1 }} of {{ images.length }}
        </div>
        
        <div class="flex items-center gap-3 pointer-events-auto">
          <!-- Persistent Register Button -->
          <app-button variant="solid" size="sm" routerLink="/auth/register" class="shadow-lg transform hover:scale-105 transition-transform">
            Register for Free
          </app-button>
          
          <button (click)="close.emit()" class="text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 p-2 rounded-full transition-all active:scale-95 shadow-sm">
            <lucide-icon [name]="icons.X" class="w-6 h-6"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- Image Container -->
      <div class="flex-1 flex items-center justify-center overflow-hidden relative w-full h-full p-4 md:p-8">
        
        <!-- Navigation Left -->
        <button (click)="prev($event)" [disabled]="currentIndex() === 0"
                class="absolute left-2 md:left-6 z-10 w-12 h-12 rounded-full bg-slate-800/50 hover:bg-slate-700/80 text-white flex items-center justify-center disabled:opacity-0 transition-all backdrop-blur-sm shadow-lg active:scale-95">
          <lucide-icon [name]="icons.ChevronLeft" class="w-8 h-8"></lucide-icon>
        </button>

        <!-- Main Image with Soft Gate -->
        <div class="relative max-h-full max-w-full flex items-center justify-center h-full w-full" (click)="$event.stopPropagation()">
          <img [src]="images[currentIndex()].url" 
               [alt]="images[currentIndex()].alt" 
               class="max-h-[90vh] md:max-h-[85vh] w-auto object-contain rounded-lg shadow-2xl transition-all duration-300" />
               
          <!-- End of Gallery Banner -->
          @if (currentIndex() === images.length - 1) {
            <div class="absolute bottom-4 md:bottom-8 inset-x-0 mx-auto max-w-2xl z-20 flex flex-col items-center justify-center px-4">
              <div class="bg-white p-6 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border-2 border-blue-500 w-full flex flex-col sm:flex-row items-center gap-6 justify-between">
                <div class="flex-1 text-center sm:text-left">
                  <h3 class="text-xl font-extrabold text-slate-900 leading-tight">Want to see a full inspection?</h3>
                  <p class="text-slate-600 text-sm mt-1">Get your own free Inspectly account to generate reports in minutes.</p>
                </div>
                <div class="shrink-0 w-full sm:w-auto flex justify-center mt-4 sm:mt-0">
                  <app-button variant="solid" size="lg" routerLink="/auth/register" class="whitespace-nowrap shadow-lg">
                    Register for Free
                  </app-button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Navigation Right -->
        <button (click)="next($event)" [disabled]="currentIndex() === images.length - 1"
                class="absolute right-2 md:right-6 z-10 w-12 h-12 rounded-full bg-slate-800/50 hover:bg-slate-700/80 text-white flex items-center justify-center disabled:opacity-0 transition-all backdrop-blur-sm shadow-lg active:scale-95">
          <lucide-icon [name]="icons.ChevronRight" class="w-8 h-8"></lucide-icon>
        </button>

      </div>
    </div>
  `,
  providers: [
    {
      provide: 'lucideIcons',
      useValue: { X, ChevronLeft, ChevronRight, Maximize, Shield }
    }
  ]
})
export class ImageLightboxComponent implements OnInit, OnDestroy {
  readonly icons = { X, ChevronLeft, ChevronRight, Maximize, Shield };

  @Input() images: { url: string, alt: string }[] = [];
  @Input() initialIndex: number = 0;
  @Output() close = new EventEmitter<void>();

  currentIndex = signal(0);

  ngOnInit() {
    this.currentIndex.set(this.initialIndex);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    this.close.emit();
  }

  @HostListener('window:keydown.ArrowRight')
  onArrowRight() {
    this.next(null);
  }

  @HostListener('window:keydown.ArrowLeft')
  onArrowLeft() {
    this.prev(null);
  }

  next(event: Event | null) {
    if (event) event.stopPropagation();
    if (this.currentIndex() < this.images.length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  prev(event: Event | null) {
    if (event) event.stopPropagation();
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }

  onBackdropClick(event: Event) {
    this.close.emit();
  }
}
