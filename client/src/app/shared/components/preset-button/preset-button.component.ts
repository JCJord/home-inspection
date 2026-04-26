import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplatePreset } from '../../../core/models/inspection.interface';

@Component({
  selector: 'app-preset-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preset-button.component.html',
  styleUrl: './preset-button.component.scss'
})
export class PresetButtonComponent {
  @Input({ required: true }) preset!: TemplatePreset;
  @Input() isActive = false;
  @Output() selected = new EventEmitter<void>();

  onClick(): void {
    this.selected.emit();
  }
}
