import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from "../button/button";

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './confirmation-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationModalComponent {
  title = input('تأكيد');
  message = input('هل أنت متأكد؟');
  confirmText = input('تأكيد');
  cancelText = input('إلغاء');

  confirm = output<void>();
  cancel = output<void>();
}
