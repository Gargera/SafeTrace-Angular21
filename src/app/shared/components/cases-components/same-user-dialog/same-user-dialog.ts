import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../../button/button';
import { DuplicateDecision } from '../../../enums/duplicate-decision';

@Component({
  selector: 'app-same-user-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './same-user-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SameUserDialogComponent {
  readonly duplicateDecision = input.required<DuplicateDecision>();
  readonly close = output<void>();

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement) === event.currentTarget) {
      this.close.emit();
    }
  }
}
