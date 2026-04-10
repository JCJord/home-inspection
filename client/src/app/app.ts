import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { NavbarDesktop } from './features/dashboard/components/navbar-desktop/navbar-desktop';
import { NavbarMobile } from './features/dashboard/components/navbar-mobile/navbar-mobile';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarDesktop, NavbarMobile],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  authService = inject(AuthService);
  protected readonly title = signal('client');
}
