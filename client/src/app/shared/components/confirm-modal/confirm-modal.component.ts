import { Component, HostListener, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, AlertTriangle, Info, X } from 'lucide-angular';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss'
})
export class ConfirmModalComponent {
  title = input.required<string>();
  message = input.required<string>();
  confirmText = input<string>('Confirm');
  cancelText = input<string>('Cancel');
  isDestructive = input<boolean>(false);
  isLoading = input<boolean>(false);
  
  confirm = output<void>();
  cancel = output<void>();

  readonly icons = { AlertTriangle, Info, X };

  @HostListener('document:keydown.escape')
  onEscape() {
    if (!this.isLoading()) {
      this.cancel.emit();
    }
  }
}
