import { Component, forwardRef, input, signal, computed, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, FormsModule } from '@angular/forms';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';

@Component({
  selector: 'app-location-combobox',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './location-combobox.component.html',
  styleUrls: ['./location-combobox.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocationComboboxComponent),
      multi: true
    }
  ]
})
export class LocationComboboxComponent implements ControlValueAccessor {
  locationPresets = input<string[]>([]);
  placeholder = input<string>('e.g., Master Bathroom, North Attic');
  disabled = input<boolean>(false);

  readonly icons = { ChevronDown };
  
  value = signal<string>('');
  isOpen = signal<boolean>(false);
  
  onChange = (value: string) => {};
  onTouched = () => {};

  filteredPresets = computed(() => {
    const val = this.value().toLowerCase();
    const presets = this.locationPresets() || [];
    if (!val) return presets;
    return presets.filter(p => p.toLowerCase().includes(val));
  });

  constructor(private elementRef: ElementRef) {}

  writeValue(obj: any): void {
    if (obj !== undefined && obj !== null) {
      this.value.set(obj);
    } else {
      this.value.set('');
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // handled via signal/input depending on angular 17+ approach.
    // If the framework passes disabled state via CVA, we can capture it here.
    // However, since we use `disabled` as a signal input, we can just let Angular's normal data binding handle it if they bind [disabled] or if we need to update a local signal.
  }

  onInput(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    this.value.set(inputEl.value);
    this.onChange(inputEl.value);
    this.isOpen.set(true);
  }

  onFocus() {
    if (!this.disabled()) {
      this.isOpen.set(true);
      this.onTouched();
    }
  }

  selectPreset(preset: string) {
    this.value.set(preset);
    this.onChange(preset);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
