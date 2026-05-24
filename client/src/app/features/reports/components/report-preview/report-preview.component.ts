import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ReportCanvasComponent } from '../report-canvas/report-canvas.component';

@Component({
  selector: 'app-report-preview',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReportCanvasComponent],
  template: `
    @if (isOpen()) {
      <div class="report-preview-overlay" (click)="closePreview()">
        <div class="report-preview-modal" (click)="$event.stopPropagation()">
          <!-- Header with close button -->
          <div class="report-preview-header">
            <h2 class="report-preview-title">Report Preview</h2>
            <button 
              class="report-preview-close-btn" 
              (click)="closePreview()"
              aria-label="Close preview"
            >
              <lucide-icon [name]="icons.X" [size]="24"></lucide-icon>
            </button>
          </div>

          <!-- Report canvas in preview mode -->
          <div class="report-preview-content">
            <app-report-canvas [inspection]="inspection"></app-report-canvas>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './report-preview.component.scss'
})
export class ReportPreviewComponent {
  @Input() inspection: Inspection | null = null;
  @Output() closed = new EventEmitter<void>();

  isOpen = signal(false);
  readonly icons = { X };

  openPreview(): void {
    this.isOpen.set(true);
  }

  closePreview(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }
}
