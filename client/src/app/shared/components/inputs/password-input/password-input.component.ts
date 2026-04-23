import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-input.component.html',
  styleUrl: './password-input.component.scss',
  viewProviders: [
    {
      provide: ControlContainer,
      useExisting: FormGroupDirective,
    },
  ],
})
export class PasswordInputComponent {
  private formGroupDirective = inject(FormGroupDirective);

  /**
   * The name of the form control to bind to.
   * Must exist in the parent FormGroup.
   * @required
   */
  name = input.required<string>();

  /**
   * Optional label displayed above the input.
   */
  label = input<string>();

  /**
   * Optional placeholder text.
   */
  placeholder = input<string>('');

  /**
   * Internal state for password visibility toggle.
   */
  protected showPassword = signal<boolean>(false);

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
   * Toggles the password visibility.
   */
  togglePassword() {
    this.showPassword.update(show => !show);
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
    if (errors['passwordMismatch']) return 'Passwords do not match';

    return 'Invalid password';
  }
}
