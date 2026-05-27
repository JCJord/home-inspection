import { Directive, ElementRef, HostListener, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: '[appPhoneMask]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneMaskDirective),
      multi: true,
    },
  ],
})
export class PhoneMaskDirective implements ControlValueAccessor {
  public enabled = input<boolean>(true, { alias: 'appPhoneMask' });
  private onChange: any = () => {};
  private onTouched: any = () => {};

  constructor(private elementRef: ElementRef<HTMLInputElement>) {}

  @HostListener('input', ['$event'])
  onInput(event: any) {
    const value = event.target.value;
    if (!this.enabled()) {
      this.onChange(value);
      return;
    }
    const formatted = this.formatPhone(value);
    this.elementRef.nativeElement.value = formatted;
    this.onChange(formatted);
  }

  @HostListener('blur')
  onBlur() {
    if (!this.enabled()) {
      this.onTouched();
      return;
    }
    this.onTouched();
  }

  writeValue(value: any): void {
    if (!this.enabled()) {
      this.elementRef.nativeElement.value = value || '';
      return;
    }
    const formatted = this.formatPhone(value || '');
    this.elementRef.nativeElement.value = formatted;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.elementRef.nativeElement.disabled = isDisabled;
  }

  private formatPhone(value: string): string {
    if (!value) return '';

    // Strip all non-digit characters
    let clean = value.replace(/\D/g, '');

    // Max 10 digits for standard phone format
    if (clean.length > 10) {
      clean = clean.substring(0, 10);
    }

    const length = clean.length;
    if (length === 0) {
      return '';
    } else if (length < 4) {
      return `(${clean}`;
    } else if (length < 7) {
      return `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
    } else {
      return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
    }
  }
}
