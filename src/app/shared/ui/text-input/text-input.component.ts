import { ChangeDetectionStrategy, Component, forwardRef, input, output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { FormLabelComponent } from '../label/form-label.component';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [ReactiveFormsModule, FormLabelComponent],
  template: `
    <div class="w-full">
      @if (label()) {
        <app-form-label>{{ label() }}</app-form-label>
      }

      <div class="relative">
        @if (prefix()) {
          <div
            class="pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center text-on-surface-variant"
          >
            <ng-content select="[prefix]"></ng-content>
          </div>
        }

        <input
          [type]="type()"
          [value]="value"
          [placeholder]="placeholder()"
          [attr.aria-label]="label() || placeholder()"
          [disabled]="disabled()"
          class="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3.5 text-sm text-on-surface placeholder:text-on-surface-variant outline-none transition-all duration-200 focus:border-secondary focus:ring-4 focus:ring-secondary/20"
          [class.pr-10]="prefix()"
          [class.pl-10]="suffix()"
          [class.pl-3.5]="!suffix()"
          [class.pr-3.5]="!prefix()"
          (input)="handleInput($event)"
          (blur)="onTouched()"
        />

        @if (suffix()) {
          <div
            class="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center text-on-surface-variant"
          >
            <ng-content select="[suffix]"></ng-content>
          </div>
        }
      </div>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInputComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextInputComponent implements ControlValueAccessor {
  readonly label = input('');
  readonly placeholder = input('');
  readonly type = input<'text' | 'email' | 'password' | 'search' | 'number'>('text');
  readonly disabled = input(false);
  readonly prefix = input(false);
  readonly suffix = input(false);
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
    // no-op; Angular handles disabled state through input
  }

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value || null;
    this.value = value;
    this.onChange(value);
    this.changed.emit(value);
  }
}
