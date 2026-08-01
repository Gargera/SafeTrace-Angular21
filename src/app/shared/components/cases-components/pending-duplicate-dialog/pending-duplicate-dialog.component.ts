import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ButtonComponent } from '../../button/button';

/**
 * <app-pending-duplicate-dialog>
 *
 * Shown when the backend returns duplicateType = 'Pending'.
 * Informs the user that a similar case is under review.
 * Does NOT expose any pending case details (no images, no name, no similarity).
 * Emits `close` when the user dismisses the dialog.
 */
@Component({
  selector: 'app-pending-duplicate-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './pending-duplicate-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingDuplicateDialogComponent {
  readonly close = output<void>();

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement) === event.currentTarget) {
      this.close.emit();
    }
  }
}
