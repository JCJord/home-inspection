import { Component, signal, inject, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { NavbarDesktop } from './features/dashboard/components/navbar-desktop/navbar-desktop';
import { NavbarMobile } from './features/dashboard/components/navbar-mobile/navbar-mobile';

import { TopBarComponent } from './shared/components/top-bar/top-bar.component';
import { SyncHudComponent } from './shared/components/sync-hud/sync-hud.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarDesktop, NavbarMobile, TopBarComponent, SyncHudComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  authService = inject(AuthService);
  private router = inject(Router);
  
  protected readonly title = signal('client');
  isPublicRoute = signal<boolean>(false);

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isPublicRoute.set(event.urlAfterRedirects.includes('/report/'));
      }
    });

    // Reactively ensure authenticated users cannot stay on auth routes.
    // This handles edge cases like cross-tab logins or state changes where 
    // the user is already on the page and the route guard wouldn't re-trigger.
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      const isAuthRoute = this.router.url.includes('/auth');
      
      if (isAuth && isAuthRoute) {
        this.router.navigate(['/home'], { replaceUrl: true });
      }
    });
  }
}
