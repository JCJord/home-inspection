import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="toggle-container" [class.toggle-container--disabled]="disabled">
      <div class="toggle-label" (click)="toggle()">
        @if (label) {
          <span class="title">{{ label }}</span>
        }
        @if (description) {
          <span class="desc">{{ description }}</span>
        }
      </div>
      <label class="switch">
        <input 
          type="checkbox" 
          [checked]="value" 
          [disabled]="disabled"
          (change)="onInputChange($event)"
        >
        <span class="slider round"></span>
      </label>
    </div>
  `,
  styleUrls: ['./toggle-switch.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchComponent),
      multi: true
    }
  ]
})
export class ToggleSwitchComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() description?: string;

  value: boolean = false;
  disabled: boolean = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    this.value = !!value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggle() {
    if (this.disabled) return;
    this.value = !this.value;
    this.onChange(this.value);
    this.onTouched();
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.checked;
    this.onChange(this.value);
    this.onTouched();
  }
}
