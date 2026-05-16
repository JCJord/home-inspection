import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, Home, ClipboardList, Settings, Layers, Calendar, Menu, X, ChevronRight, User } from 'lucide-angular';

@Component({
  selector: 'app-navbar-mobile',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  providers: [{ provide: 'lucideIcons', useValue: { Home, ClipboardList, Settings, Layers, Calendar, Menu, X, ChevronRight, User } }],
  templateUrl: './navbar-mobile.html',
  styleUrl: './navbar-mobile.scss',
})
export class NavbarMobile {
  readonly icons = { Home, ClipboardList, Settings, Layers, Calendar, Menu, X, ChevronRight, User };
  
  isMenuOpen = signal(false);

  toggleMenu(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.isMenuOpen.update(v => !v);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }
}
