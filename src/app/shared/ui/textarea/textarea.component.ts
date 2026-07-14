import { ChangeDetectionStrategy, Component, forwardRef, input, output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { FormLabelComponent } from '../label/form-label.component';

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [ReactiveFormsModule, FormLabelComponent],
  template: `
    <div class="w-full">
      @if (label()) {
        <app-form-label>{{ label() }}</app-form-label>
      }

      <textarea
        [value]="value"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        class="min-h-24 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 py-3 text-sm text-on-surface placeholder:text-on-surface-variant outline-none transition-all duration-200 focus:border-secondary focus:ring-4 focus:ring-secondary/20"
        (input)="handleInput($event)"
        (blur)="onTouched()"
      ></textarea>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextareaComponent implements ControlValueAccessor {
  readonly label = input('');
  readonly placeholder = input('');
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
    const target = event.target as HTMLTextAreaElement;
    const value = target.value || null;
    this.value = value;
    this.onChange(value);
    this.changed.emit(value);
  }
}
