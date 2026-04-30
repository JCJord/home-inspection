import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Finding } from '../../../../core/models/inspection.interface';
import { LucideAngularModule, MapPin, Trash2, Edit, Sparkles, ChevronDown, ChevronUp, Eye } from 'lucide-angular';
import { environment } from '../../../../../environments/environment';
import { DropdownMenuComponent, DropdownItem } from '../../../../shared/components/dropdown-menu/dropdown-menu.component';
import { PhotoCarouselComponent } from '../../../../shared/components/photo-carousel/photo-carousel.component';
import { ConfirmPillComponent } from '../../../../shared/components/confirm-pill/confirm-pill.component';
import { LightboxComponent } from '../../../../shared/components/lightbox/lightbox.component';

@Component({
  selector: 'app-finding-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DropdownMenuComponent, PhotoCarouselComponent, ConfirmPillComponent, LightboxComponent],
  templateUrl: './finding-card.component.html',
  styleUrl: './finding-card.component.scss',
})
export class FindingCardComponent {
  finding = input.required<Finding>();
  isDeleting = input<boolean>(false);
  delete = output<void>();
  edit = output<void>();
  isConfirmingDelete = signal(false);
  isAiExpanded = signal(false);
  isNoteExpanded = signal(false);
  isLightboxOpen = signal(false);
  activePhotoIndex = signal(0);

  readonly icons = { MapPin, Sparkles, ChevronDown, ChevronUp, Eye };

  openLightbox(index: number) {
    this.activePhotoIndex.set(index);
    this.isLightboxOpen.set(true);
  }

  shouldShowAiExpand = computed(() => (this.finding().ai_comment?.length || 0) > 140);
  shouldShowNoteExpand = computed(() => (this.finding().short_note?.length || 0) > 140);

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
