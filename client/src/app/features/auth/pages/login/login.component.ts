import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TextInputComponent, PasswordInputComponent } from '../../../../shared';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginRequestDto } from '../../../../core/dtos/login-request.dto';
import { inject as injectAnalytics } from '@vercel/analytics';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TextInputComponent,
    PasswordInputComponent,
    ButtonComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  constructor() {
    injectAnalytics();
  }

  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  view = signal<'login' | 'forgot-password' | 'email-sent'>('login');

  loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  forgotPasswordForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      const formValue = this.loginForm.getRawValue();

      const loginDto: LoginRequestDto = {
        email: formValue.email,
        password: formValue.password,
      };

      this.authService.login(loginDto)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.router.navigate(['/home']);
          },
          error: (error) => {
            console.error('Login error:', error);

            if (error.status === 401) {
              this.loginForm.get('email')?.setErrors({ invalidCredentials: true });
              this.loginForm.get('password')?.setErrors({ invalidCredentials: true });
            }
          },
        });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  onForgotPasswordSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.isLoading.set(true);
      const email = this.forgotPasswordForm.getRawValue().email;

      this.authService.forgotPassword(email)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.view.set('email-sent');
          },
          error: (error) => {
            console.error('Forgot password error:', error);
            // Even on error, we might want to just show 'email-sent' to prevent enumeration,
            // but our backend already returns 200 OK for not found.
            // If it's a real 500 error, we can still show a generic error or the same view.
            this.view.set('email-sent');
          }
        });
    } else {
      this.forgotPasswordForm.markAllAsTouched();
    }
  }

  toggleView(newView: 'login' | 'forgot-password') {
    this.view.set(newView);
    if (newView === 'login') {
      this.forgotPasswordForm.reset();
    } else {
      this.loginForm.reset();
    }
  }

  loginWithGoogle() {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }
}
