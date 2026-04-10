import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
