import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  template: `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 1rem;">
      <app-spinner [size]="32" color="blue"></app-spinner>
      <p style="color: #64748b; font-size: 1rem;">Completing sign in...</p>
    </div>
  `
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const accessToken = params['accessToken'];
      const refreshToken = params['refreshToken'];

      if (accessToken && refreshToken) {
        this.authService.handleOAuthTokens(accessToken, refreshToken).subscribe({
          next: () => this.router.navigate(['/home']),
          error: (err) => {
            console.error('Failed to load user profile during OAuth login', err);
            this.router.navigate(['/auth/login']);
          }
        });
      } else {
        // If there's an error or missing tokens, go back to login
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
