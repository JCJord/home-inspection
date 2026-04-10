import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, House, ClipboardList, UserCircle } from 'lucide-angular';

@Component({
  selector: 'app-navbar-desktop',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './navbar-desktop.html',
  styleUrl: './navbar-desktop.scss',
})
export class NavbarDesktop {
  readonly icons = { House, ClipboardList, UserCircle };
}
