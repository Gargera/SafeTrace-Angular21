import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../../button/button';
import { DuplicateDecision } from '../../../enums/duplicate-decision';

@Component({
  selector: 'app-duplicate-info-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './duplicate-info-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuplicateInfoDialogComponent {
  readonly duplicateDecision = input.required<DuplicateDecision>();
  readonly close = output<void>();

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement) === event.currentTarget) {
      this.close.emit();
    }
  }
}
