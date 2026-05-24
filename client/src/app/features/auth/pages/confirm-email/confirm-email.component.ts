import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { LucideAngularModule, CheckCircle2, XCircle, Loader2 } from 'lucide-angular';
import { finalize } from 'rxjs';

type ConfirmState = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LucideAngularModule, RouterLink],
  templateUrl: './confirm-email.component.html',
})
export class ConfirmEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly CheckCircle2Icon = CheckCircle2;
  readonly XCircleIcon = XCircle;
  readonly Loader2Icon = Loader2;

  state = signal<ConfirmState>('loading');
  email = signal<string | null>(null);
  errorMessage = signal<string>('Your verification link is invalid or has expired.');
  isResending = signal(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const email = params['email'];
      
      if (email) {
        this.email.set(email);
      }

      if (!token) {
        this.state.set('error');
        return;
      }

      this.authService.verifyEmail(token).subscribe({
        next: () => {
          this.state.set('success');
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1500);
        },
        error: (err) => {
          console.error('Verification error:', err);
          this.state.set('error');
          if (err.error?.message) {
             this.errorMessage.set(err.error.message);
          }
        }
      });
    });
  }

  resendEmail() {
    const currentEmail = this.email();
    if (!currentEmail || this.isResending()) return;
    
    this.isResending.set(true);
    this.authService.resendVerificationEmail(currentEmail)
      .pipe(finalize(() => this.isResending.set(false)))
      .subscribe({
        next: () => {
          alert('Verification email sent! Please check your inbox.');
        },
        error: (err) => {
          console.error('Failed to resend', err);
          alert('Failed to resend verification email. Please try again later.');
        }
      });
  }
}
