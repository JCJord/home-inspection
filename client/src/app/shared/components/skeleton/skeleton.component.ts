import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skeleton-box" 
      [style.width]="width()" 
      [style.height]="height()" 
      [style.border-radius]="borderRadius()"
      [class.circle]="variant() === 'circle'"
    ></div>
  `,
  host: {
    '[style.display]': 'width().includes("%") || width().includes("vw") ? "block" : "inline-block"',
    '[style.width]': 'width()'
  },
  styles: [`
    @use 'variables' as *;

    :host {
      display: block;
      line-height: 1;
      width: var(--skeleton-width, 100%);
    }

    .skeleton-box {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background-color: $color-skeleton-bg;
      
      &::after {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        transform: translateX(-100%);
        background-image: linear-gradient(
          90deg,
          rgba($color-skeleton-shimmer, 0) 0,
          rgba($color-skeleton-shimmer, 0.5) 20%,
          rgba($color-skeleton-shimmer, 0.8) 60%,
          rgba($color-skeleton-shimmer, 0)
        );
        animation: shimmer 1.5s infinite;
      }

      &.circle {
        border-radius: 50% !important;
      }
    }

    @keyframes shimmer {
      100% {
        transform: translateX(100%);
      }
    }
  `]
})
export class SkeletonComponent {
  width = input<string>('100%');
  height = input<string>('1rem');
  borderRadius = input<string>('4px');
  variant = input<'rect' | 'circle'>('rect');
}
