import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MutationQueueService } from '../../../core/services/mutation-queue.service';
import { LucideAngularModule, Cloud, CloudOff, AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-angular';

@Component({
  selector: 'app-sync-hud',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="sync-hud" 
         [class.online]="isOnline()" 
         [class.has-active]="activeCount() > 0" 
         [class.has-failed]="failedCount() > 0"
         [class.visible]="isVisible()">
      <div class="hud-content">
        @if (failedCount() > 0) {
          <div class="status-group failed">
            <div class="flex items-center gap-1.5" (click)="retry()" title="Retry all">
              <lucide-icon [name]="icons.AlertCircle" [size]="16"></lucide-icon>
              <span>{{ failedCount() }} failed</span>
              <lucide-icon [name]="icons.RefreshCw" [size]="14" class="retry-icon"></lucide-icon>
            </div>
            <div class="w-px h-3 bg-white/20 mx-1"></div>
            <lucide-icon [name]="icons.X" [size]="16" class="hover:text-white cursor-pointer" (click)="clear()" title="Clear all errors"></lucide-icon>
          </div>
        } @else if (activeCount() > 0) {
          <div class="status-group active">
            <lucide-icon [name]="icons.Cloud" [size]="16" class="animate-pulse"></lucide-icon>
            <span>{{ activeCount() }} syncing...</span>
          </div>
        } @else if (!isOnline()) {
          <div class="status-group offline">
            <lucide-icon [name]="icons.CloudOff" [size]="16"></lucide-icon>
            <span>Offline</span>
          </div>
        } @else {
          <div class="status-group synced">
            <lucide-icon [name]="icons.CheckCircle2" [size]="16"></lucide-icon>
            <span>All synced</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @use '/variables' as *;

    .sync-hud {
      position: fixed;
      bottom: 5rem; // Above mobile navbar
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 16px;
      border-radius: 100px;
      z-index: 1000;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      color: white;
      font-size: 0.8125rem;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;

      &.visible {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
        pointer-events: auto;
      }

      @media (min-width: 769px) {
        bottom: 2rem;
      }
    }

    .hud-content {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }

    .status-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-group.active { color: $color-primary; }
    .status-group.failed { 
      color: $color-error;
      cursor: pointer;
      &:hover .retry-icon { transform: rotate(180deg); }
    }
    .status-group.offline { color: $color-text-muted; }
    .status-group.synced { color: $color-success; opacity: 0.8; }

    .retry-icon {
      transition: transform 0.3s;
      margin-left: 2px;
    }

    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: .5; }
    }
  `]
})
export class SyncHudComponent {
  private queueService = inject(MutationQueueService);
  
  activeCount = this.queueService.activeTasksCount;
  failedCount = this.queueService.failedTasksCount;
  isOnline = this.queueService.isOnline;

  readonly icons = { Cloud, CloudOff, AlertCircle, CheckCircle2, RefreshCw, X };

  isVisible(): boolean {
    // Show if there is activity, failure, or if we just went offline
    return this.activeCount() > 0 || this.failedCount() > 0 || !this.isOnline();
  }

  retry() {
    this.queueService.retryFailedTasks();
  }

  clear() {
    this.queueService.clearAllTasks();
  }
}
