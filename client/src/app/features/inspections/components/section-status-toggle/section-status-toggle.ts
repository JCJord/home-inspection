import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, CheckCircle2, Ban, CircleX, Info } from 'lucide-angular';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-section-status-toggle',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent],
  templateUrl: './section-status-toggle.component.html',
  styleUrl: './section-status-toggle.component.scss'
})
export class SectionStatusToggleComponent {
  @Input({ required: true }) status: 'inspected' | 'not_inspected' | 'not_present' = 'inspected';
  @Input() reason: string = '';
  @Input() disabled: boolean = false;
  
  @Output() statusChange = new EventEmitter<'inspected' | 'not_inspected' | 'not_present'>();
  @Output() reasonChange = new EventEmitter<string>();

  readonly icons = { CheckCircle2, Ban, CircleX, Info };

  onStatusChange(newStatus: 'inspected' | 'not_inspected' | 'not_present') {
    if (this.disabled || this.status === newStatus) return;
    this.statusChange.emit(newStatus);
  }

  onReasonBlur(event: any) {
    this.reasonChange.emit(event.target.value);
  }
}
