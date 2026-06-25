import { Component, inject, input, signal, ElementRef, ViewChild, OnInit, OnDestroy, DoCheck } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule, FormControl } from '@angular/forms';
import { LucideAngularModule, X, Plus } from 'lucide-angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chips-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './chips-input.component.html',
  styleUrl: './chips-input.component.scss',
  providers: [{ provide: 'lucideIcons', useValue: { X, Plus } }],
  viewProviders: [
    {
      provide: ControlContainer,
      useExisting: FormGroupDirective,
    },
  ],
})
export class ChipsInputComponent implements OnInit, OnDestroy, DoCheck {
  private formGroupDirective = inject(FormGroupDirective, { optional: true });

  name = input<string>('');
  label = input<string>();
  placeholder = input<string>('Type and press Enter or comma...');
  disabled = input<boolean>(false);

  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  chips = signal<string[]>([]);
  inputValue = signal<string>('');

  private valueChangesSub?: Subscription;
  private lastControl: FormControl | null = null;

  get control() {
    return this.formGroupDirective?.form.get(this.name()) as FormControl | null;
  }

  get isDisabled(): boolean {
    return this.disabled() || !!this.control?.disabled;
  }

  ngOnInit() {
    this.setupControl();
  }

  ngDoCheck() {
    const currentControl = this.control;
    if (currentControl !== this.lastControl) {
      this.lastControl = currentControl;
      this.setupControl();
    }
  }

  ngOnDestroy() {
    this.valueChangesSub?.unsubscribe();
  }

  setupControl() {
    this.valueChangesSub?.unsubscribe();
    const ctrl = this.control;
    if (ctrl) {
      this.syncChipsFromControlValue(ctrl.value);
      this.valueChangesSub = ctrl.valueChanges.subscribe(val => {
        const currentStr = this.chips().join(', ');
        const incomingStr = val || '';
        if (this.normalizeString(currentStr) !== this.normalizeString(incomingStr)) {
          this.syncChipsFromControlValue(incomingStr);
        }
      });
    } else {
      this.chips.set([]);
    }
  }

  normalizeString(val: any): string {
    if (typeof val === 'string') {
      return val.split(',').map(s => s.trim()).filter(Boolean).join(',');
    } else if (Array.isArray(val)) {
      return val.map(s => String(s || '').trim()).filter(Boolean).join(',');
    }
    return '';
  }

  syncChipsFromControlValue(val: any) {
    if (typeof val === 'string') {
      const parsed = val.split(',').map(s => s.trim()).filter(Boolean);
      this.chips.set(parsed);
    } else if (Array.isArray(val)) {
      const parsed = val.map(s => String(s || '').trim()).filter(Boolean);
      this.chips.set(parsed);
    } else {
      this.chips.set([]);
    }
  }

  updateControlValue() {
    const ctrl = this.control;
    if (ctrl) {
      const valStr = this.chips().join(', ');
      ctrl.setValue(valStr);
      ctrl.markAsDirty();
      ctrl.markAsTouched();
    }
  }

  addChip(value: string) {
    if (this.isDisabled) return;
    const trimmed = value.trim().replace(/,$/, '').trim();
    if (trimmed && !this.chips().includes(trimmed)) {
      this.chips.update(current => [...current, trimmed]);
      this.updateControlValue();
    }
    this.inputValue.set('');
    if (this.inputEl) {
      this.inputEl.nativeElement.value = '';
    }
  }

  removeChip(index: number) {
    if (this.isDisabled) return;
    this.chips.update(current => current.filter((_, i) => i !== index));
    this.updateControlValue();
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.isDisabled) return;
    const target = event.target as HTMLInputElement;
    const value = target.value;

    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addChip(value);
    } else if (event.key === 'Backspace' && !value && this.chips().length > 0) {
      this.removeChip(this.chips().length - 1);
    }
  }

  onBlur(event: FocusEvent) {
    if (this.isDisabled) return;
    const target = event.target as HTMLInputElement;
    if (target.value) {
      this.addChip(target.value);
    }
  }

  get isInvalid() {
    return this.control?.invalid && (this.control?.dirty || this.control?.touched);
  }

  getFirstError(): string {
    const errors = this.control?.errors;
    if (!errors) return '';
    if (errors['required']) return 'This field is required';
    return 'Please check this field';
  }
}
