import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, CheckCircle2, Ban, CircleX, Info } from 'lucide-angular';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-section-status-toggle',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ButtonComponent],
  templateUrl: './section-status-toggle.component.html',
  styleUrl: './section-status-toggle.component.scss'
})
export class SectionStatusToggleComponent implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) status: 'inspected' | 'not_inspected' | 'not_present' = 'inspected';
  @Input() reason: string = '';
  @Input() disabled: boolean = false;
  
  @Output() statusChange = new EventEmitter<'inspected' | 'not_inspected' | 'not_present'>();
  @Output() reasonChange = new EventEmitter<string>();

  readonly icons = { CheckCircle2, Ban, CircleX, Info };

  localStatus: 'inspected' | 'not_inspected' | 'not_present' = 'inspected';
  private statusSubject = new Subject<'inspected' | 'not_inspected' | 'not_present'>();
  private sub?: Subscription;

  ngOnInit() {
    this.localStatus = this.status;
    this.sub = this.statusSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(newStatus => {
      this.statusChange.emit(newStatus);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['status'] && !changes['status'].firstChange) {
      this.localStatus = this.status;
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onStatusChange(newStatus: 'inspected' | 'not_inspected' | 'not_present') {
    if (this.disabled || this.localStatus === newStatus) return;
    this.localStatus = newStatus; // Optimistic UI update
    this.statusSubject.next(newStatus);
  }

  onReasonBlur(event: any) {
    this.reasonChange.emit(event.target.value);
  }
}
