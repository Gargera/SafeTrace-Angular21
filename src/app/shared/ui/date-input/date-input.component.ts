import { ChangeDetectionStrategy, Component, forwardRef, input, output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { FormLabelComponent } from '../label/form-label.component';

@Component({
  selector: 'app-date-input',
  standalone: true,
  imports: [ReactiveFormsModule, FormLabelComponent],
  template: `
    <div class="w-full">
      @if (label()) {
        <app-form-label>{{ label() }}</app-form-label>
      }

      <input
        type="date"
        [value]="value"
        [disabled]="disabled()"
        class="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 text-sm text-on-surface outline-none transition-all duration-200 focus:border-secondary focus:ring-4 focus:ring-secondary/20"
        (input)="handleInput($event)"
        (blur)="onTouched()"
      />
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInputComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateInputComponent implements ControlValueAccessor {
  readonly label = input('');
  readonly disabled = input(false);
  readonly changed = output<string | null>();

  value: string | null = null;
  protected onChange = (_value: string | null) => {};
  protected onTouched = () => {};

  writeValue(value: string | null): void {
    this.value = value ?? null;
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // no-op
  }

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value || null;
    this.value = value;
    this.onChange(value);
    this.changed.emit(value);
  }
}
