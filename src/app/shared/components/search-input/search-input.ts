import { Component, input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './search-input.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchInputComponent), multi: true }]
})
export class SearchInputComponent implements ControlValueAccessor {
  placeholder = input('بحث...');
  
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
