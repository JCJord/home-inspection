import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, output, input, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, RotateCcw, Check } from 'lucide-angular';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './signature-pad.component.html',
  styleUrl: './signature-pad.component.scss',
  providers: [{ provide: 'lucideIcons', useValue: { RotateCcw, Check } }]
})
export class SignaturePadComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  initialSignature = input<string | null>(null);
  signatureSaved = output<string>();
  cleared = output<void>();

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  protected hasDrawn = signal(false);
  
  // Icons for the pad
  readonly icons = { RotateCcw, Check };

  ngAfterViewInit(): void {
    this.initCanvas();
    if (this.initialSignature()) {
      this.loadSignature(this.initialSignature()!);
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    // Set internal resolution based on CSS size * device pixel ratio for sharpness
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    // Set drawing styles
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#111827'; // Dark gray/black
  }

  @HostListener('window:resize')
  onResize(): void {
    // We don't want to clear on every resize, but we might need to adjust
    // For now, simple init is safest for a signature pad
  }

  startDrawing(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isDrawing = true;
    this.hasDrawn.set(true);
    
    const pos = this.getEventPos(event);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing) return;
    event.preventDefault();
    
    const pos = this.getEventPos(event);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopDrawing(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.save();
  }

  clear(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasDrawn.set(false);
    this.cleared.emit();
  }

  save(): void {
    if (!this.hasDrawn()) return;
    
    // Export as Base64 PNG
    const dataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
    this.signatureSaved.emit(dataUrl);
  }

  private getEventPos(event: MouseEvent | TouchEvent): { x: number, y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private loadSignature(base64: string): void {
    const img = new Image();
    img.onload = () => {
      this.ctx.drawImage(img, 0, 0, this.canvasRef.nativeElement.width / devicePixelRatio, this.canvasRef.nativeElement.height / devicePixelRatio);
      this.hasDrawn.set(true);
    };
    img.src = base64;
  }
}
