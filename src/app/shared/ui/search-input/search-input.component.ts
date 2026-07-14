import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TextInputComponent } from '../text-input/text-input.component';
import { SearchIconComponent } from "../icon/search-icon.component";

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [TextInputComponent, SearchIconComponent],
  template: `
    <app-text-input
      [label]="label()"
      [placeholder]="placeholder()"
      [type]="'search'"
      [disabled]="disabled()"
      [prefix]="true"
      [suffix]="false"
      [value]="value"
      (changed)="changed.emit($event)"
    >
      <span prefix
        ><app-search-icon [size]="'1rem'" extraClass="text-on-surface-variant"></app-search-icon
      ></span>
    </app-text-input>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchInputComponent {
  readonly label = input('');
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly changed = output<string | null>();
  value: string | null = null;
}
