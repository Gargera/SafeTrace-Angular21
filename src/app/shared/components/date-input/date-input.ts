import { Component, input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-date-input',
  standalone: true,
  templateUrl: './date-input.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateInputComponent), multi: true }]
})
export class DateInputComponent implements ControlValueAccessor {
  label = input('');
  value: string = '';
  disabled = false;
  onChange = (v: any) => {};
  onTouched = () => {};

  writeValue(val: any): void { this.value = val || ''; }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.value = val;
    this.onChange(val);
  }
  handleBlur() { this.onTouched(); }
}
