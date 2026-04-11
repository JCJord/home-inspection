import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, House, ClipboardList, UserCircle, LogOut } from 'lucide-angular';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-navbar-desktop',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './navbar-desktop.html',
  styleUrl: './navbar-desktop.scss',
})
export class NavbarDesktop {
  authService = inject(AuthService);
  private router = inject(Router);

  readonly icons = { House, ClipboardList, UserCircle, LogOut };

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
