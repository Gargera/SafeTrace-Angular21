import { Component, HostListener, input, output } from '@angular/core';

/**
 * Generic, reusable confirmation dialog. Fully controlled by the parent via
 * the `open` input — the parent owns the boolean signal that decides
 * whether the dialog is visible, and reacts to `confirmed` / `cancelled`.
 *
 * Closes on: Escape key, backdrop click, or explicit Cancel button —
 * all three simply emit `cancelled`, leaving the decision of what happens
 * next entirely up to the parent.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly open = input.required<boolean>();
  readonly title = input<string>('تأكيد العملية');
  readonly message = input<string>('');
  readonly confirmLabel = input<string>('تأكيد');
  readonly cancelLabel = input<string>('إلغاء');
  readonly danger = input<boolean>(false);
  readonly loading = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  onBackdropClick(): void {
    if (!this.loading()) {
      this.cancelled.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open() && !this.loading()) {
      this.cancelled.emit();
    }
  }
}
