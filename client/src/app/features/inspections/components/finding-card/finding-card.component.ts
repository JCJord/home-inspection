import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Finding } from '../../../../core/models/inspection.interface';
import { LucideAngularModule, MapPin, Trash2, Edit, Sparkles } from 'lucide-angular';
import { environment } from '../../../../../environments/environment';
import { DropdownMenuComponent, DropdownItem } from '../../../../shared/components/dropdown-menu/dropdown-menu.component';
import { PhotoCarouselComponent } from '../../../../shared/components/photo-carousel/photo-carousel.component';

@Component({
  selector: 'app-finding-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DropdownMenuComponent, PhotoCarouselComponent],
  templateUrl: './finding-card.component.html',
  styleUrl: './finding-card.component.scss',
})
export class FindingCardComponent {
  finding = input.required<Finding>();
  isDeleting = input<boolean>(false);
  delete = output<void>();
  edit = output<void>();
  isConfirmingDelete = signal(false);

  readonly icons = { MapPin, Sparkles };

  resolvedImages = computed<string[]>(() => {
    return (this.finding().photos || []).map(p => this.resolveImageUrl(p.storage_url));
  });

  menuItems = computed<DropdownItem[]>(() => [
    {
      label: 'Edit',
      icon: Edit,
      action: () => this.edit.emit(),
    },
    {
      label: 'Delete',
      icon: Trash2,
      action: () => this.isConfirmingDelete.set(true),
      danger: true,
    },
  ]);

  resolveImageUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${environment.apiUrl}${path}`;
  }
}
