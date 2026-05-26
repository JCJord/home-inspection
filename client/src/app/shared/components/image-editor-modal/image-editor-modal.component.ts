import { Component, ElementRef, ViewChild, input, output, signal, HostListener, afterNextRender, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Check, Undo, RotateCcw, Circle, ArrowUpRight, Pencil, ZoomIn, ZoomOut, Maximize, ChevronUp, ChevronDown, Hand, RotateCw } from 'lucide-angular';

@Component({
  selector: 'app-image-editor-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './image-editor-modal.component.html',
  styleUrl: './image-editor-modal.component.scss'
})
export class ImageEditorModalComponent implements OnInit, OnDestroy {
  imageUrl = input.required<string>();
  
  close = output<void>();
  save = output<Blob>();

  @ViewChild('editorDialog') dialogRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('canvasElement') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('containerElement') containerRef!: ElementRef<HTMLDivElement>;

  readonly icons: Record<string, any> = { 
    X, Check, Undo, RotateCcw, Pencil, Circle, ArrowUpRight, ZoomIn, ZoomOut, Maximize, ChevronUp, ChevronDown, Hand, RotateCw 
  };

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  imageElement = new Image();
  
  activeTool = signal<'brush' | 'circle' | 'oval' | 'arrow' | 'pan'>('brush');
  strokeColor = signal<string>('#ef4444'); // Default Red
  strokeWidth = signal<number>(1); // Default thin (will be scaled)
  zoomLevel = signal<number>(1);
  
  // Track the "fitted" size of the image at 1x zoom
  baseDisplaySize = signal<{width: number, height: number}>({width: 0, height: 0});
  rotation = signal<number>(0); // 0, 90, 180, 270
  
  private startCoords: {x: number, y: number} | null = null;
  
  // To handle undo operations, we save snapshots
  private history: ImageData[] = [];

  constructor() {
    afterNextRender(() => {
      this.initCanvas();
      if (this.dialogRef) {
        this.dialogRef.nativeElement.showModal();
      }
    });
  }

  cycleColor() {
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];
    const current = this.strokeColor();
    const nextIndex = (colors.indexOf(current) + 1) % colors.length;
    this.strokeColor.set(colors[nextIndex]);
  }

  ngOnInit() {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    this.ctx = ctx;

    fetch(this.imageUrl(), { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        this.imageElement.onload = () => {
          this.resizeCanvas();
          this.calculateBaseDisplaySize();
          URL.revokeObjectURL(objectUrl);
        };
        this.imageElement.src = objectUrl;
      })
      .catch((err) => {
        console.error('Failed to load image in canvas editor:', err);
      });
  }

  @HostListener('window:resize')
  onResize() {
    this.calculateBaseDisplaySize();
  }

  private calculateBaseDisplaySize() {
    if (!this.containerRef || !this.imageElement.width) return;
    
    const container = this.containerRef.nativeElement;
    const availableWidth = container.offsetWidth;
    const availableHeight = container.offsetHeight;
    
    // If rotated 90 or 270, we swap the aspect ratio for fitting calculation
    const isVertical = this.rotation() % 180 !== 0;
    const imgW = isVertical ? this.imageElement.height : this.imageElement.width;
    const imgH = isVertical ? this.imageElement.width : this.imageElement.height;
    
    const imageRatio = imgW / imgH;
    const containerRatio = availableWidth / availableHeight;
    
    let width, height;
    if (imageRatio > containerRatio) {
      width = availableWidth;
      height = width / imageRatio;
    } else {
      height = availableHeight;
      width = height * imageRatio;
    }
    
    this.baseDisplaySize.set({ width, height });
  }

  rotate() {
    this.rotation.update(r => (r + 90) % 360);
    this.calculateBaseDisplaySize();
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.imageElement.width;
    canvas.height = this.imageElement.height;
    this.ctx.drawImage(this.imageElement, 0, 0);
    this.saveState();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      this.undo();
    }
  }

  private getEventCoords(event: MouseEvent | TouchEvent): {x: number, y: number} {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const rot = this.rotation();
    
    let clientX, clientY;
    if (event instanceof TouchEvent) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // Relative position within the visual bounding box
    const rx = clientX - rect.left;
    const ry = clientY - rect.top;
    
    // Normalize to [0, 1] range within the visual bounding box
    const nx = rx / rect.width;
    const ny = ry / rect.height;

    let x, y;
    // Map normalized coordinates back to canvas pixels based on rotation
    switch(rot) {
      case 90:
        x = ny * canvas.width;
        y = (1 - nx) * canvas.height;
        break;
      case 180:
        x = (1 - nx) * canvas.width;
        y = (1 - ny) * canvas.height;
        break;
      case 270:
        x = (1 - ny) * canvas.width;
        y = nx * canvas.height;
        break;
      default: // 0
        x = nx * canvas.width;
        y = ny * canvas.height;
        break;
    }

    return { x, y };
  }

  startDrawing(event: MouseEvent | TouchEvent) {
    if (this.activeTool() === 'pan') return;
    event.preventDefault();
    this.isDrawing = true;
    this.startCoords = this.getEventCoords(event);
    
    // Setup stroke style based on signals
    this.ctx.strokeStyle = this.strokeColor();
    
    // Base thickness calculation reduced by 2px as requested
    const baseWidth = Math.max(4, this.imageElement.width * 0.006); 
    this.ctx.lineWidth = baseWidth * this.strokeWidth();
    
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (this.activeTool() === 'brush') {
      this.ctx.beginPath();
      this.ctx.moveTo(this.startCoords.x, this.startCoords.y);
    }
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing || !this.startCoords) return;
    event.preventDefault();
    const coords = this.getEventCoords(event);

    if (this.activeTool() === 'brush') {
      this.ctx.lineTo(coords.x, coords.y);
      this.ctx.stroke();
    } else {
      // Shape drawing: we need to restore the state for every move to show preview
      this.restoreLastState();
      
      if (this.activeTool() === 'circle') {
        this.drawCircle(this.startCoords, coords);
      } else if (this.activeTool() === 'oval') {
        this.drawOval(this.startCoords, coords);
      } else if (this.activeTool() === 'arrow') {
        this.drawArrow(this.startCoords, coords);
      }
    }
  }

  private drawCircle(start: {x: number, y: number}, end: {x: number, y: number}) {
    const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    this.ctx.beginPath();
    this.ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  private drawOval(start: {x: number, y: number}, end: {x: number, y: number}) {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;
    
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  private drawArrow(start: {x: number, y: number}, end: {x: number, y: number}) {
    const headLength = this.ctx.lineWidth * 4;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    // Arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
    this.ctx.stroke();
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.startCoords = null;
    this.saveState();
  }

  private saveState() {
    const canvas = this.canvasRef.nativeElement;
    this.history.push(this.ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  private restoreLastState() {
    if (this.history.length > 0) {
      this.ctx.putImageData(this.history[this.history.length - 1], 0, 0);
    }
  }

  zoomIn() {
    this.zoomLevel.update(z => Math.min(z + 0.5, 4));
    // Automatically switch to pan tool when zooming in to help navigation
    this.activeTool.set('pan');
  }

  zoomOut() {
    this.zoomLevel.update(z => Math.max(z - 0.5, 1));
  }

  resetZoom() {
    this.zoomLevel.set(1);
  }

  undo() {
    if (this.history.length > 1) {
      this.history.pop();
      this.restoreLastState();
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
    canvas.toBlob((blob) => {
      if (blob) {
        this.save.emit(blob);
      }
    }, 'image/jpeg', 0.9);
  }
}
