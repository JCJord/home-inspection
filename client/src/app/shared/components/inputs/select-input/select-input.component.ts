import { Component, inject, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';

export interface SelectOption {
  value: string | number;
  label: string;
}

@Component({
  selector: 'app-select-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './select-input.component.html',
  styleUrl: './select-input.component.scss',
  viewProviders: [
    {
      provide: ControlContainer,
      useExisting: FormGroupDirective,
    },
  ],
})
export class SelectInputComponent {
  private formGroupDirective = inject(FormGroupDirective, { optional: true });

  /**
   * The name of the form control to bind to.
   * Must exist in the parent FormGroup.
   */
  name = input<string>('');

  /**
   * Optional label displayed above the select.
   */
  label = input<string>();

  /**
   * The array of options to display.
   * Can be an array of strings or SelectOption objects.
   * @required
   */
  options = input.required<string[] | SelectOption[]>();

  /**
   * Normalize options array into objects for loop rendering.
   */
  mappedOptions = computed(() => {
    const opts = this.options();
    if (!opts || opts.length === 0) return [];
    return opts.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  });

  /**
   * Manual value binding (used if no form control is provided)
   */
  value = input<string | number>('');

  /**
   * Whether the input is disabled
   */
  disabled = input<boolean>(false);

  /**
   * Emits when the input value changes (manual binding)
   */
  valueChanged = output<string>();

  onSelectChange(event: Event) {
    const target = event.target as HTMLSelectElement;
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
    return 'Invalid selection';
  }
}
