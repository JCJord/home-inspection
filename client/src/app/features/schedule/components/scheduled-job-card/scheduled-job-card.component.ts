import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, MapPin, User, Clock, ChevronRight, Edit2, Trash2, X, ChevronDown, Phone, Share2, ExternalLink } from 'lucide-angular';
import { Inspection } from '../../../../core/models/inspection.interface';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { DropdownMenuComponent, DropdownItem } from '../../../../shared/components/dropdown-menu/dropdown-menu.component';
import { ConfirmPillComponent } from '../../../../shared/components/confirm-pill/confirm-pill.component';

@Component({
  selector: 'app-scheduled-job-card',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ButtonComponent,
    DropdownMenuComponent,
    ConfirmPillComponent,
  ],
  templateUrl: './scheduled-job-card.component.html',
  styleUrl: './scheduled-job-card.component.scss',
  providers: [
    {
      provide: 'lucideIcons',
      useValue: {
        MapPin,
        User,
        Clock,
        ChevronRight,
        Edit2,
        Trash2,
        X,
        ChevronDown,
        Phone,
        Share2,
        ExternalLink,
      },
    },
  ],
})
export class ScheduledJobCardComponent {
  @Input({ required: true }) job!: Inspection;
  @Input() confirmingJobId: string | null = null;
  @Input() confirmationType: 'delete' | 'cancel' | null = null;

  @Output() confirm = new EventEmitter<Inspection>();
  @Output() cancelConfirmation = new EventEmitter<void>();
  @Output() open = new EventEmitter<Inspection>();
  @Output() edit = new EventEmitter<Inspection>();
  @Output() delete = new EventEmitter<Inspection>();
  @Output() cancel = new EventEmitter<Inspection>();

  readonly icons = {
    MapPin,
    User,
    Clock,
    ChevronRight,
    Edit2,
    Trash2,
    X,
    ChevronDown,
    Phone,
    Share2,
    ExternalLink,
  };

  menuItems = computed<DropdownItem[]>(() => {
    const items: DropdownItem[] = [];

    if (this.job.status === 'published') {
      items.push(
        {
          label: 'View Live Report',
          icon: this.icons.ExternalLink,
          action: () => window.open(`${window.location.origin}/report/${this.job.id}`, '_blank'),
        },
        {
          label: 'Copy Public Link',
          icon: this.icons.Share2,
          action: () => this.copyToClipboard(`${window.location.origin}/report/${this.job.id}`),
        }
      );
    }

    items.push(
      {
        label: 'Open Inspection',
        icon: this.icons.Clock,
        action: () => this.open.emit(this.job),
      },
      {
        label: 'Edit Schedule',
        icon: this.icons.Edit2,
        action: () => this.edit.emit(this.job),
      },
      {
        label: 'Delete',
        icon: this.icons.Trash2,
        danger: true,
        action: () => this.delete.emit(this.job),
      },
      {
        label: 'Cancel Inspection',
        icon: this.icons.X,
        danger: true,
        action: () => this.cancel.emit(this.job),
      }
    );

    return items;
  });

  private copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast here if we had a toast service injected
    });
  }

  formatDateOnly(date?: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatTimeOnly(date?: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  isToday(dateStr?: string | Date): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  isPast(dateStr?: string | Date): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }
}
