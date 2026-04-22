import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, MoreHorizontal, MoreVertical } from 'lucide-angular';

export interface DropdownItem {
  label: string;
  icon: any; // Using any to support Lucide Icon objects
  action: () => void;
  danger?: boolean;
}

@Component({
  selector: 'app-dropdown-menu',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './dropdown-menu.component.html',
  styleUrl: './dropdown-menu.component.scss'
})
export class DropdownMenuComponent {
  private elementRef = inject(ElementRef);

  icon = input<'vertical' | 'horizontal'>('vertical');
  items = input<DropdownItem[]>([]);
  
  isOpen = signal(false);
  openUpwards = signal(false);

  readonly icons = {
    MoreVertical,
    MoreHorizontal
  };

  toggle(event: Event) {
    event.stopPropagation();
    
    if (this.isOpen()) {
      this.isOpen.set(false);
      return;
    }

    const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const approximateItemHeight = 42; 
    const paddingHeight = 16;
    const estimatedDropdownHeight = (this.items().length * approximateItemHeight) + paddingHeight;
    
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    this.openUpwards.set(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow);
    this.isOpen.set(true);
  }

  onItemClick(event: Event, item: DropdownItem) {
    event.stopPropagation();
    item.action();
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: EventTarget | null) {
    if (!targetElement) return;
    
    const clickedInside = this.elementRef.nativeElement.contains(targetElement as Node);
    if (!clickedInside && this.isOpen()) {
      this.isOpen.set(false);
    }
  }
}
