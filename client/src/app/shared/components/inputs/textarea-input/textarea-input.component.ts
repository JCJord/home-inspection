import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-textarea-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './textarea-input.component.html',
  styleUrl: './textarea-input.component.scss',
  viewProviders: [
    {
      provide: ControlContainer,
      useExisting: FormGroupDirective,
    },
  ],
})
export class TextareaInputComponent {
  private formGroupDirective = inject(FormGroupDirective);

  /**
   * The name of the form control to bind to.
   * Must exist in the parent FormGroup.
   * @required
   */
  name = input.required<string>();

  /**
   * Optional label displayed above the textarea.
   */
  label = input<string>();

  /**
   * Optional placeholder text.
   */
  placeholder = input<string>('');

  /**
   * Number of visible text lines for the control.
   */
  rows = input<number>(4);
  
  /**
   * Whether the textarea is read-only.
   */
  readonly = input<boolean>(false);

  /**
   * Optional maximum length of the text.
   */
  maxLength = input<number | null>(null);

  /**
   * Accesses the injected form control.
   */
  get control() {
    return this.formGroupDirective.form.get(this.name());
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
    if (errors['minlength']) return `Minimum length is ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `Maximum length is ${errors['maxlength'].requiredLength} characters`;
    if (errors['pattern']) return 'Invalid format';

    return 'Invalid field';
  }
}
