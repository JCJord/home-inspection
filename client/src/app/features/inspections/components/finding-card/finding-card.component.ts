import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Finding } from '../../../../core/models/inspection.interface';
import { LucideAngularModule, MapPin, Trash2, Edit, ChevronDown, ChevronUp, Eye, ChevronRight, Wrench, Ban } from 'lucide-angular';
import { environment } from '../../../../../environments/environment';
import { DropdownMenuComponent, DropdownItem } from '../../../../shared/components/dropdown-menu/dropdown-menu.component';
import { PhotoCarouselComponent } from '../../../../shared/components/photo-carousel/photo-carousel.component';
import { ConfirmPillComponent } from '../../../../shared/components/confirm-pill/confirm-pill.component';
import { LightboxComponent } from '../../../../shared/components/lightbox/lightbox.component';
import { ResolveImagePipe } from '../../../../shared/pipes/resolve-image.pipe';

@Component({
  selector: 'app-finding-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DropdownMenuComponent, ConfirmPillComponent, LightboxComponent, ResolveImagePipe],
  templateUrl: './finding-card.component.html',
  styleUrl: './finding-card.component.scss',
})
export class FindingCardComponent {
  finding = input.required<Finding>();
  readOnly = input<boolean>(false);
  isDeleting = input<boolean>(false);
  isExcluded = input<boolean>(false);
  delete = output<void>();
  edit = output<void>();
  isConfirmingDelete = signal(false);
  isNoteExpanded = signal(false);
  isLightboxOpen = signal(false);
  activePhotoIndex = signal(0);

  readonly icons = { MapPin, ChevronDown, ChevronUp, Eye, ChevronRight, Wrench, Ban };

  openLightbox(index: number) {
    this.activePhotoIndex.set(index);
    this.isLightboxOpen.set(true);
  }

  shouldShowNoteExpand = computed(() => (this.finding().description?.length || 0) > 140);

  resolvedImages = computed<string[]>(() => {
    return (this.finding().photos || []).map(p => p.storage_url);
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

  toggleNoteExpansion(event: Event) {
    event.stopPropagation();
    if (this.shouldShowNoteExpand()) {
      this.isNoteExpanded.set(!this.isNoteExpanded());
    }
  }
}
