import { ChangeDetectionStrategy, Component, forwardRef, input, output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { FormLabelComponent } from '../label/form-label.component';

@Component({
  selector: 'app-select-input',
  standalone: true,
  imports: [ReactiveFormsModule, FormLabelComponent],
  template: `
    <div class="w-full">
      @if (label()) {
        <app-form-label>{{ label() }}</app-form-label>
      }

      <div class="relative">
        <select
          [value]="value"
          [disabled]="disabled()"
          class="h-11 w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 pl-10 text-sm text-on-surface outline-none transition-all duration-200 focus:border-secondary focus:ring-4 focus:ring-secondary/20"
          (change)="handleChange($event)"
          (blur)="onTouched()"
        >
          <ng-content />
        </select>

        @if (icon()) {
          <div
            class="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center text-on-surface-variant"
          >
            <ng-content select="[icon]"></ng-content>
          </div>
        }
      </div>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectInputComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectInputComponent implements ControlValueAccessor {
  readonly label = input('');
  readonly disabled = input(false);
  readonly icon = input(false);
  readonly changed = output<unknown>();

  value: unknown = null;
  protected onChange = (_value: unknown) => {};
  protected onTouched = () => {};

  writeValue(value: unknown): void {
    this.value = value ?? null;
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // no-op
  }

  handleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.value = value;
    this.onChange(value);
    this.changed.emit(value);
  }
}
