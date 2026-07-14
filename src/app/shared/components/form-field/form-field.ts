import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-field.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormField),
      multi: true,
    },
  ],
})
export class FormField implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type:
    'text' | 'email' | 'password' | 'number' | 'date' | 'search' | 'textarea' | 'select' = 'text';

  @Input() rows = 4;

  @Input() prefix = false;
  @Input() suffix = false;

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
