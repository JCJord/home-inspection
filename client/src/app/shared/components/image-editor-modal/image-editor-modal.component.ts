import { Component, ElementRef, ViewChild, input, output, signal, HostListener, afterNextRender, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Check, Undo, RotateCcw, Circle, ArrowUpRight, Pencil, ZoomIn, ZoomOut, Maximize, ChevronUp, ChevronDown } from 'lucide-angular';

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
  @ViewChild('paletteScrollArea') paletteScrollRef!: ElementRef<HTMLDivElement>;

  readonly icons: Record<string, any> = { 
    X, Check, Undo, RotateCcw, Pencil, Circle, ArrowUpRight, ZoomIn, ZoomOut, Maximize, ChevronUp, ChevronDown 
  };

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  imageElement = new Image();
  
  activeTool = signal<'brush' | 'circle' | 'arrow'>('brush');
  strokeColor = signal<string>('#ef4444'); // Default Red
  strokeWidth = signal<number>(1); // Default thin (will be scaled)
  zoomLevel = signal<number>(1);
  isPaletteOpen = signal<boolean>(false);
  
  isPaletteTop = signal<boolean>(true);
  isPaletteBottom = signal<boolean>(true);
  
  private startCoords: {x: number, y: number} | null = null;
  
  // To handle undo operations, we save snapshots
  private history: ImageData[] = [];

  constructor() {
    afterNextRender(() => {
      this.initCanvas();
      if (this.dialogRef) {
        this.dialogRef.nativeElement.showModal();
      }
      this.checkPaletteScroll();
    });
  }

  togglePalette() {
    this.isPaletteOpen.update(v => !v);
    if (this.isPaletteOpen()) {
      setTimeout(() => this.checkPaletteScroll(), 100);
    }
  }

  checkPaletteScroll() {
    if (!this.paletteScrollRef) return;
    const el = this.paletteScrollRef.nativeElement;
    this.isPaletteTop.set(el.scrollTop <= 5);
    this.isPaletteBottom.set(el.scrollHeight - el.scrollTop - el.clientHeight <= 5);
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

    this.imageElement.crossOrigin = 'anonymous';
    this.imageElement.onload = () => {
      this.resizeCanvas();
    };
    this.imageElement.src = this.imageUrl();
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
