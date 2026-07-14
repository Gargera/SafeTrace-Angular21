import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [NgClass],
  templateUrl: './text-input.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextInputComponent), multi: true }]
})
export class TextInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() prefix = false;
  @Input() suffix = false;
  
  value: string = '';
  disabled = false;
  onChange = (v: any) => {};
  onTouched = () => {};

  writeValue(val: any): void { this.value = val || ''; }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  handleInput(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.value = val;
    this.onChange(val);
  }
  handleBlur(): void { this.onTouched(); }
}
