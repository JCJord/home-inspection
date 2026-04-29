import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Template } from '../../models/template.interface';
import { LucideAngularModule, Copy, Trash2, Star, FileText, LayoutGrid, Database, CheckCircle } from 'lucide-angular';
import { DropdownMenuComponent, DropdownItem } from '../../../../shared/components/dropdown-menu/dropdown-menu.component';
import { ConfirmPillComponent } from '../../../../shared/components/confirm-pill/confirm-pill.component';

@Component({
  selector: 'app-template-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DropdownMenuComponent, ConfirmPillComponent],
  templateUrl: './template-card.component.html',
  styleUrl: './template-card.component.scss',
})
export class TemplateCardComponent {
  template = input.required<Template>();
  preferredTemplateId = input<string | null>(null);

  clone = output<Template>();
  edit = output<Template>();
  delete = output<Template>();

  isConfirmingDelete = signal(false);

  readonly icons = {
    Copy,
    Trash2,
    Star,
    FileText,
    LayoutGrid,
    Database,
    CheckCircle
  };

  sectionCount = computed(() => this.template().structure?.sections?.length || 0);
  
  fieldCount = computed(() => 
    this.template().structure?.sections?.reduce((total, section) => total + (section.fields?.length || 0), 0) || 0
  );

  presetCount = computed(() => 
    this.template().structure?.sections?.reduce((total, section) => total + (section.presets?.length || 0), 0) || 0
  );

  menuItems = computed<DropdownItem[]>(() => {
    const items: DropdownItem[] = [
      {
        label: 'Clone',
        icon: this.icons.Copy,
        action: () => this.clone.emit(this.template()),
      }
    ];

    if (this.template().inspector_id) {
      items.push({
        label: 'Delete',
        icon: this.icons.Trash2,
        danger: true,
        action: () => this.isConfirmingDelete.set(true),
      });
    }

    return items;
  });

  onCardClick() {
    this.edit.emit(this.template());
  }
}
