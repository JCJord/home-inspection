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
        <div class="header-content flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1>Settings</h1>
            <p class="subtitle">Manage your account information and preferences</p>
          </div>

          <!-- Global Auto-save Status -->
          <div class="auto-save-status">
            @if (inspectorsService.isSaving()) {
              <div class="status-indicator saving">
                <lucide-icon [name]="icons.Loader2" [size]="14" class="animate-spin"></lucide-icon>
                Saving changes...
              </div>
            } @else if (inspectorsService.lastSavedAt(); as lastSaved) {
              <div class="status-indicator saved">
                <lucide-icon [name]="icons.CheckCircle2" [size]="14"></lucide-icon>
                Saved at {{ lastSaved | date:'shortTime' }}
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
      .status-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8125rem;
        font-weight: 600;
        padding: 0.5rem 1rem;
        border-radius: 2rem;
        background: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;

        &.saving {
          color: $color-primary;
          border-color: rgba($color-primary, 0.2);
        }

        &.saved {
          color: $color-success;
          border-color: rgba($color-success, 0.2);
          background: rgba($color-success, 0.02);
        }

        .animate-spin {
          animation: spin 1s linear infinite;
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
