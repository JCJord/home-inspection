import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { User, ShieldCheck } from 'lucide-angular';
import { TabsComponent, TabItem } from '../../../../shared/components/tabs/tabs.component';

@Component({
  selector: 'app-settings-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TabsComponent],
  template: `
    <div class="settings-container max-w-7xl mx-auto p-6 pb-24 relative">
      <header class="settings-header">
        <div class="header-content">
          <h1>Settings</h1>
          <p class="subtitle">Manage your account information and preferences</p>
        </div>

        <app-tabs [items]="navItems"></app-tabs>
      </header>

      <main class="settings-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    @use '/variables' as *;

    :host {
      display: block;
      width: 100%;
      animation: pageFadeIn 0.35s ease-out forwards;
    }

    .settings-container {
      // Classes handle padding and max-width
    }

    .settings-header {      
      .header-content {
        margin-bottom: 2rem;

        h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: $color-text;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: $color-text-muted;
          font-size: 0.875rem;
        }
      }
    }

    .settings-main {
      min-height: 500px;
      width: 100%;
    }

    @keyframes pageFadeIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class SettingsLayoutComponent {
  readonly navItems: TabItem[] = [
    { label: 'Personal Profile', link: 'profile', icon: User },
    { label: 'Report Compliance', link: 'compliance', icon: ShieldCheck }
  ];
}
