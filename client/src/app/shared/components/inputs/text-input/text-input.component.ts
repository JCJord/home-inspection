import { Component, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, Edit2 } from 'lucide-angular';
import { CurrencyMaskDirective } from '../../../directives/currency-mask.directive';
import { PhoneMaskDirective } from '../../../directives/phone-mask.directive';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, CurrencyMaskDirective, PhoneMaskDirective],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.scss',
  providers: [{ provide: 'lucideIcons', useValue: { Edit2 } }],
  viewProviders: [
    {
      provide: ControlContainer,
      useExisting: FormGroupDirective,
    },
  ],
})
export class TextInputComponent {
  private formGroupDirective = inject(FormGroupDirective, { optional: true });

  /**
   * The name of the form control to bind to.
   * Must exist in the parent FormGroup.
   */
  name = input<string>('');

  /**
   * Optional label displayed above the input.
   */
  label = input<string>();

  /**
   * Optional placeholder text.
   */
  placeholder = input<string>('');

  /**
   * The HTML type of the input.
   * @default 'text'
   */
  type = input<'text' | 'email' | 'number' | 'tel'>('text');

  /**
   * Whether to apply currency masking.
   */
  isCurrency = input<boolean>(false);

  /**
   * Whether to apply phone masking.
   */
  isPhone = input<boolean>(false);

  /**
   * Computed input type (forces text if currency mask is active)
   */
  inputType = computed(() => (this.isCurrency() || this.isPhone()) ? 'text' : this.type());

  /**
   * Optional prefix text displayed before the input value.
   */
  prefix = input<string>();

  /**
   * Optional suffix text displayed after the input value.
   */
  suffix = input<string>();

  /**
   * Optional suffix icon (LucideIcon object)
   */
  suffixIcon = input<any>();

  /**
   * Manual value binding (used if no form control is provided)
   */
  value = input<string | number>('');

  /**
   * Whether the input is disabled
   */
  disabled = input<boolean>(false);

  /**
   * Optional maximum length of the text.
   */
  maxLength = input<number | null>(null);

  /**
   * Emits when the input value changes (manual binding)
   */
  valueChanged = output<string>();

  onInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.valueChanged.emit(target.value);
  }

  /**
   * Accesses the injected form control.
   */
  get control() {
    return this.formGroupDirective?.form.get(this.name());
  }

  /**
   * Returns true if the control is invalid and has been interacted with.
   */
  get isInvalid() {
    return this.control?.invalid && (this.control?.dirty || this.control?.touched);
  }

  /**
   * Maps validation errors to human-readable error messages.
   */
  getFirstError(): string {
    const errors = this.control?.errors;
    if (!errors) return '';

    if (errors['required']) return 'This field is required';
    if (errors['email']) return 'Invalid email address';
    if (errors['emailExists']) return 'This email is already registered';
    if (errors['invalidCode']) return 'Invalid, expired, or fully used invite code';
    if (errors['minlength']) return `Minimum length is ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `Maximum length is ${errors['maxlength'].requiredLength} characters`;
    if (errors['min']) return `Minimum value is ${errors['min'].min}`;
    if (errors['max']) return `Maximum value is ${errors['max'].max}`;
    if (errors['pattern']) return 'Invalid format';

    return 'Please check this field';
  }
}
