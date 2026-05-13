import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, Home, ClipboardList, Settings, Layers } from 'lucide-angular';

@Component({
  selector: 'app-navbar-mobile',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  providers: [{ provide: 'lucideIcons', useValue: { Home, ClipboardList, Settings, Layers } }],
  templateUrl: './navbar-mobile.html',
  styleUrl: './navbar-mobile.scss',
})
export class NavbarMobile {
  readonly icons = { Home, ClipboardList, Settings, Layers };
}
