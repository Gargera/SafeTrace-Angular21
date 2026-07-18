import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './confirmation-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationModalComponent {
  title = input('تأكيد');
  message = input('هل أنت متأكد؟');
  confirmText = input('تأكيد');
  cancelText = input('إلغاء');
  icon = input('help_outline');
  variant = input<'primary' | 'danger'>('primary');

  confirm = output<void>();
  cancel = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancel.emit();
  }
}
