import { CommonModule } from '@angular/common';
import { Component, input, computed, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-field.html',
  host: {
    '[class]': 'hostClasses()'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormField),
      multi: true,
    },
  ],
})
export class FormField implements ControlValueAccessor {
  label = input('');
  placeholder = input('');
  type = input<'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'search' | 'textarea' | 'select' | 'tel'>('text');

  min = input<string | number | undefined>(undefined);
  max = input<string | number | undefined>(undefined);

  rows = input(4);
  extraClass = input('');
  isInvalid = input(false);

  prefix = input(false);
  suffix = input(false);

  hasError = computed(() => this.isInvalid() || this.extraClass().includes('border-error'));

  hostClasses = computed(() => {
    // Remove border-error from host class to prevent double borders
    return this.extraClass().replace(/\bborder-error\b/g, '').trim();
  });

  labelParts = computed(() => {
    const raw = this.label();
    if (!raw) return { text: '', hasStar: false };
    if (raw.includes('*')) {
      return { text: raw.replace(/\*/g, '').trim(), hasStar: true };
    }
    return { text: raw, hasStar: false };
  });

  value: any = '';
  disabled = false;

  onChange = (_: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  handleInput(event: Event) {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.value = value;
    this.onChange(value);
  }

  onModelChange(value: any) {
    let parsedValue = value;
    if (parsedValue === '' || parsedValue === null || parsedValue === 'null' || parsedValue === undefined) {
      parsedValue = null;
    } else if (typeof parsedValue === 'string' && parsedValue.trim() !== '' && !isNaN(Number(parsedValue))) {
      parsedValue = Number(parsedValue);
    }

    this.value = parsedValue;
    this.onChange(parsedValue);
  }

  handleBlur() {
    this.onTouched();
  }
}