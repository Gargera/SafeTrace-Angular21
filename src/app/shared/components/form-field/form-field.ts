import { CommonModule } from '@angular/common';
import { Component, input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-field.html',
  host: {
    '[class]': 'extraClass()'
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
  type = input<'text' | 'email' | 'password' | 'number' | 'date' | 'search' | 'textarea' | 'select' | 'tel'>('text');

  rows = input(4);
  extraClass = input('');

  prefix = input(false);
  suffix = input(false);

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
    this.value = value;
    this.onChange(value);
  }

  handleBlur() {
    this.onTouched();
  }
}