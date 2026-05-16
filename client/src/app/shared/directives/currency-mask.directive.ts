import { Directive, ElementRef, HostListener, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: '[appCurrencyMask]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyMaskDirective),
      multi: true,
    },
  ],
})
export class CurrencyMaskDirective implements ControlValueAccessor {
  public enabled = input<boolean>(true, { alias: 'appCurrencyMask' });
  private onChange: any;
  private onTouched: any;

  constructor(private elementRef: ElementRef<HTMLInputElement>) {}

  @HostListener('input', ['$event'])
  onInput(event: any) {
    const value = event.target.value;
    if (!this.enabled()) {
      this.onChange(value);
      return;
    }
    const numericValue = this.parse(value);
    this.updateView(numericValue);
    this.onChange(numericValue);
  }

  @HostListener('blur')
  onBlur() {
    if (!this.enabled()) {
      this.onTouched();
      return;
    }
    const value = this.elementRef.nativeElement.value;
    const numericValue = this.parse(value);
    if (numericValue !== null) {
      this.updateView(numericValue, true);
    }
    this.onTouched();
  }

  writeValue(value: any): void {
    if (!this.enabled()) {
      this.elementRef.nativeElement.value = value || '';
      return;
    }
    const numericValue = value === null || value === undefined ? null : Number(value);
    this.updateView(numericValue, true);
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

  private parse(value: string): number | null {
    if (!value) return null;
    // Strip everything except digits and one decimal point
    const clean = value.replace(/[^0-9.]/g, '');
    const number = parseFloat(clean);
    return isNaN(number) ? null : number;
  }

  private updateView(value: number | null, isBlur: boolean = false): void {
    if (value === null) {
      this.elementRef.nativeElement.value = '';
      return;
    }

    let formattedValue: string;
    if (isBlur) {
      // Format with 2 decimal places on blur
      formattedValue = value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      // Basic formatting on input (handle partial input)
      const parts = value.toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formattedValue = parts.join('.');
    }

    this.elementRef.nativeElement.value = formattedValue;
  }
}
