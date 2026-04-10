import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TextInputComponent, PasswordInputComponent } from '../../../../shared';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginRequestDto } from '../../../../core/dtos/login-request.dto';

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
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);

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
            this.router.navigate(['/dashboard']);
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
}
