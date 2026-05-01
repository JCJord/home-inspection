import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Check, X } from 'lucide-angular';

@Component({
  selector: 'app-confirm-pill',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './confirm-pill.component.html',
  styleUrl: './confirm-pill.component.scss'
})
export class ConfirmPillComponent {
  confirmText = input<string>('Delete');
  cancelText = input<string>('Cancel');

  confirm = output<void>();
  cancel = output<void>();

  readonly icons = {
    Check,
    X
  };
}
