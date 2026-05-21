import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { User, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-angular';
import { TabsComponent, TabItem } from '../../../../shared/components/tabs/tabs.component';
import { InspectorsService } from '../../../../core/services/inspectors.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-settings-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TabsComponent, LucideAngularModule],
  template: `
    <div class="settings-container max-w-7xl mx-auto p-6 pb-24 relative">
      <header class="settings-header">
        <div class="header-content flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1>Settings</h1>
            <p class="subtitle">Manage your account information and preferences</p>
          </div>

          <div class="auto-save-status">
            @if (inspectorsService.isSaving()) {
              <div class="status-indicator saving">
                <lucide-icon [name]="icons.Loader2" [size]="13" class="animate-spin"></lucide-icon>
                <span>Saving<span class="hidden sm:inline"> changes</span>...</span>
              </div>
            } @else if (inspectorsService.lastSavedAt(); as lastSaved) {
              <div class="status-indicator saved">
                <lucide-icon [name]="icons.CheckCircle2" [size]="13"></lucide-icon>
                <span>Saved<span class="hidden sm:inline"> at {{ lastSaved | date:'shortTime' }}</span></span>
              </div>
            }
          </div>
        </div>

        <app-tabs [items]="navItems"></app-tabs>
      </header>

      <main class="settings-main pt-5">
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

    .auto-save-status {
      flex-shrink: 0;

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.375rem 0.75rem;
        border-radius: 1.5rem;
        border: 1px solid transparent;
        transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        animation: floatIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;

        &.saving {
          color: $color-primary;
          background: rgba($color-primary, 0.08);
          border-color: rgba($color-primary, 0.15);
          animation: floatIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards, pulseGlow 2s infinite ease-in-out;
        }

        &.saved {
          color: $color-text-muted;
          background: $color-surface-light;
          border-color: $color-border;
        }

        .animate-spin {
          animation: spin 1.2s linear infinite;
        }
      }
    }

    .settings-main {
      min-height: 500px;
      width: 100%;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
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

    @keyframes floatIn {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes pulseGlow {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba($color-primary, 0.1);
      }
      50% {
        box-shadow: 0 0 8px 2px rgba($color-primary, 0.2);
      }
    }
  `]
})
export class SettingsLayoutComponent {
  inspectorsService = inject(InspectorsService);
  readonly icons = { Loader2, CheckCircle2 };

  readonly navItems: TabItem[] = [
    { label: 'Personal Profile', link: 'profile', icon: User },
    { label: 'Report Compliance', link: 'compliance', icon: ShieldCheck }
  ];
}
