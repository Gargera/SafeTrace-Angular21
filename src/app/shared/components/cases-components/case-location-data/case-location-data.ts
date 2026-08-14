import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../button/button';
import { FormField } from '../../form-field/form-field';

@Component({
  selector: 'app-case-location-data',
  standalone: true,
  imports: [ReactiveFormsModule, FormField, ButtonComponent],
  templateUrl: './case-location-data.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseLocationDataComponent {
  form = input.required<FormGroup>();
  isInvalid = input.required<(field: string) => boolean>();
  getError = input.required<(field: string) => string | null>();

  governorates = input.required<string[]>();
  cities = input.required<string[]>();

  selectedAddress = input<string>('');
  locationError = input<string | null>(null);
  isLocating = input<boolean>(false);

  minEventDate = input<string>('');
  maxEventDate = input<string>('');
  showMapPicker = input<boolean>(true);
  showEventDate = input<boolean>(true);
  eventDateType = input<'date' | 'datetime-local'>('datetime-local');

  openMap = output<void>();
  useCurrentLocation = output<void>();
}
