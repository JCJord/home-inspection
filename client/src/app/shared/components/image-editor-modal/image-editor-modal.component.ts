import { Component, ElementRef, ViewChild, input, output, effect, signal, HostListener, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Check, Undo, RotateCcw } from 'lucide-angular';

@Component({
  selector: 'app-image-editor-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './image-editor-modal.component.html',
  styleUrl: './image-editor-modal.component.scss'
})
export class ImageEditorModalComponent {
  imageUrl = input.required<string>();
  
  close = output<void>();
  save = output<Blob>();

  @ViewChild('canvasElement') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('containerElement') containerRef!: ElementRef<HTMLDivElement>;

  readonly icons = { X, Check, Undo, RotateCcw };

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private imageElement = new Image();
  
  // To handle undo operations, we could save snapshots. For simple undo, an array of ImageData
  private history: ImageData[] = [];

  constructor() {
    afterNextRender(() => {
      this.initCanvas();
    });
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    // Load image
    this.imageElement.crossOrigin = 'anonymous'; // Important for canvas toBlob if pulling from API
    this.imageElement.onload = () => {
      this.resizeCanvas();
    };
    this.imageElement.src = this.imageUrl();
  }

  @HostListener('window:resize')
  onResize() {
    // Only resize if we haven't drawn much, or resize strictly transforms it. 
    // Usually, image editors lock orientation or do complex projection.
    // For simplicity, we just redraw the latest history state scaled.
    // However, canvas resizing clears it. A better approach is to keep the original image size and scale the canvas via CSS!
    // So the internal resolution is exactly the image resolution.
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const container = this.containerRef.nativeElement;

    // Set internal resolution to image native resolution
    canvas.width = this.imageElement.width;
    canvas.height = this.imageElement.height;

    // Draw the image onto it
    this.ctx.drawImage(this.imageElement, 0, 0);
    this.saveState(); // initial state
  }

  // Helper to get correct coordinates regardless of CSS scaling
  private getEventCoords(event: MouseEvent | TouchEvent): {x: number, y: number} {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (event instanceof TouchEvent) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  startDrawing(event: MouseEvent | TouchEvent) {
    event.preventDefault(); // Prevent scrolling
    this.isDrawing = true;
    const coords = this.getEventCoords(event);
    
    this.ctx.beginPath();
    this.ctx.moveTo(coords.x, coords.y);
    
    // Setup stroke style
    this.ctx.strokeStyle = '#ef4444'; // Red for clear visibility
    this.ctx.lineWidth = Math.max(5, this.imageElement.width * 0.005); // Scale line width reasonably
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
    event.preventDefault();
    const coords = this.getEventCoords(event);
    this.ctx.lineTo(coords.x, coords.y);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    this.ctx.closePath();
    this.isDrawing = false;
    this.saveState();
  }

  // --- Actions ---

  private saveState() {
    const canvas = this.canvasRef.nativeElement;
    this.history.push(this.ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  undo() {
    if (this.history.length > 1) {
      this.history.pop(); // remove current state
      const previousState = this.history[this.history.length - 1];
      this.ctx.putImageData(previousState, 0, 0);
    }
  }

  reset() {
    if (this.history.length > 0) {
      const initialState = this.history[0];
      this.history = [initialState];
      this.ctx.putImageData(initialState, 0, 0);
    }
  }

  onSave() {
    const canvas = this.canvasRef.nativeElement;
    // Export high-quality JPEG
    canvas.toBlob((blob) => {
      if (blob) {
        this.save.emit(blob);
      }
    }, 'image/jpeg', 0.9);
  }
}
