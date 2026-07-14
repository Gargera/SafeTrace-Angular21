import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-select-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './select-input.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectInputComponent), multi: true }]
})
export class SelectInputComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() icon = false;
  
  value: any = null;
  disabled = false;
  onChange = (v: any) => {};
  onTouched = () => {};

  writeValue(val: any): void { this.value = val; }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  onModelChange(val: any) {
    this.value = val;
    this.onChange(val);
  }
  handleBlur() { this.onTouched(); }
}
