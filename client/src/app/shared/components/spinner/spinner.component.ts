import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  template: '',
  host: {
    'class': 'animate-spin rounded-full border-2 border-white border-t-transparent block',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()'
  }
})
export class SpinnerComponent {
  /**
   * The size of the spinner in pixels (width and height).
   * @default 16
   */
  size = input<number>(16);
}
