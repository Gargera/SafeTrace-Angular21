import { Component, input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-textarea',
  standalone: true,
  templateUrl: './textarea.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextareaComponent), multi: true }]
})
export class TextareaComponent implements ControlValueAccessor {
  label = input('');
  placeholder = input('');
  rows = input(4);
  
  value: string = '';
  disabled = false;
  onChange = (v: any) => {};
  onTouched = () => {};

  writeValue(val: any): void { this.value = val || ''; }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  handleInput(e: Event): void {
    const val = (e.target as HTMLTextAreaElement).value;
    this.value = val;
    this.onChange(val);
  }
  handleBlur(): void { this.onTouched(); }
}
