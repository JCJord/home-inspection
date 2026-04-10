import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../spinner/spinner.component';

export type ButtonVariant = 'solid' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  host: {
    '[class.w-full]': 'full()'
  }
})
export class ButtonComponent {
  /**
   * The visual style of the button.
   * @default 'solid'
   */
  variant = input<ButtonVariant>('solid');

  /**
   * The size of the button.
   * @default 'md'
   */
  size = input<ButtonSize>('md');

  /**
   * Whether the button is in a loading state.
   * When true, shows a spinner and disables interaction.
   * @default false
   */
  isLoading = input<boolean>(false);

  /**
   * Whether the button is disabled.
   * @default false
   */
  disabled = input<boolean>(false);

  /**
   * Whether the button should take up the full width of its container.
   * @default false
   */
  full = input<boolean>(false);

  /**
   * The HTML type attribute for the button.
   * @default 'button'
   */
  type = input<'button' | 'submit' | 'reset'>('button');

  /**
   * Calculates the appropriate spinner size based on the button size.
   */
  protected spinnerSize = computed(() => {
    switch (this.size()) {
      case 'sm': return 14;
      case 'lg': return 20;
      default: return 16;
    }
  });
}
