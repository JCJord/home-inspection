import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TextInputComponent, PasswordInputComponent } from '../../../../shared';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AuthService } from '../../../../core/services/auth.service';
import { SeoService } from '../../../../core/services/seo.service';
import { RegisterRequestDto } from '../../../../core/dtos/register-request.dto';
import { LucideAngularModule, MailCheck } from 'lucide-angular';

import { environment } from '../../../../../environments/environment';

/**
 * Custom validator to check if password and confirmPassword fields match.
 */
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;

  if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) {
    return null;
  }

  if (password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
    confirmPassword.setErrors(null);
    return null;
  }
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TextInputComponent,
    PasswordInputComponent,
    ButtonComponent,
    LucideAngularModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {


  private authService = inject(AuthService);
  private router = inject(Router);
  private seoService = inject(SeoService);

  ngOnInit() {
    this.seoService.generateTags({
      title: 'Sign Up | Inspectly',
      description: 'Create your free Inspectly account to write home inspection reports faster, offline-first, and save your evenings.',
      noindex: true
    });
  }

  readonly MailCheckIcon = MailCheck;

  isLoading = signal(false);
  isRegistrationSuccess = signal(false);
  registeredEmail = signal('');
  resendCooldown = signal(120);
  resendTimer: any;
  isResending = signal(false);

  registerForm = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  }, { validators: passwordMatchValidator });

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      const formValue = this.registerForm.getRawValue();
      
      const registerDto: RegisterRequestDto = {
        name: formValue.fullName,
        email: formValue.email,
        password: formValue.password
      };

      this.authService.register(registerDto)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (response) => {
            console.log('Registration successful:', response);
            this.registeredEmail.set(formValue.email);
            this.isRegistrationSuccess.set(true);
            this.startResendCooldown();
          },
          error: (error) => {
            console.error('Registration error:', error);
            
            if (error.status === 409) {
              this.registerForm.get('email')?.setErrors({ emailExists: true });
            }
          }
        });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }

  startResendCooldown() {
    this.resendCooldown.set(120);
    clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      const current = this.resendCooldown();
      if (current > 0) {
        this.resendCooldown.set(current - 1);
      } else {
        clearInterval(this.resendTimer);
      }
    }, 1000);
  }

  get formattedCooldown(): string {
    const totalSeconds = this.resendCooldown();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  resendEmail() {
    if (this.resendCooldown() > 0 || this.isResending()) return;
    
    this.isResending.set(true);
    this.authService.resendVerificationEmail(this.registeredEmail())
      .pipe(finalize(() => this.isResending.set(false)))
      .subscribe({
        next: () => {
          this.startResendCooldown();
        },
        error: (err) => {
          console.error('Failed to resend verification email', err);
        }
      });
  }

  ngOnDestroy() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  loginWithGoogle() {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }
}
