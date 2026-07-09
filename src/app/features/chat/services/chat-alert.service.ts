import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions } from 'sweetalert2';

/**
 * ChatAlertsService
 * -------------------
 * Thin wrapper around SweetAlert2 (already used elsewhere in the project).
 * Centralizing it here means every chat page shows success/error/confirm
 * dialogs with the same colors and Arabic wording, instead of each
 * component building its own Swal.fire() options from scratch.
 *
 * Colors are pulled from the values in styles.css (--color-primary,
 * --color-error, --color-outline) so dialogs match the rest of the app.
 */
@Injectable({ providedIn: 'root' })
export class ChatAlertsService {
  private readonly primaryColor = '#091426'; // --color-primary
  private readonly errorColor = '#ba1a1a'; // --color-error
  private readonly outlineColor = '#75777d'; // --color-outline

  success(message: string): void {
    this.fire({ icon: 'success', title: message, confirmButtonText: 'حسناً', confirmButtonColor: this.primaryColor });
  }

  error(message: string): void {
    this.fire({
      icon: 'error',
      title: 'حدث خطأ',
      text: message,
      confirmButtonText: 'حسناً',
      confirmButtonColor: this.errorColor,
    });
  }

  info(message: string): void {
    this.fire({ icon: 'info', title: message, confirmButtonText: 'حسناً', confirmButtonColor: this.primaryColor });
  }

  warning(message: string): void {
    this.fire({ icon: 'warning', title: message, confirmButtonText: 'حسناً', confirmButtonColor: this.primaryColor });
  }

  /** Simple yes/no confirmation. Resolves true only if the user confirms. */
  async confirm(title: string, text?: string): Promise<boolean> {
    const result = await this.fire({
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: 'تأكيد',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: this.errorColor,
      cancelButtonColor: this.outlineColor,
      reverseButtons: true,
    });
    return result.isConfirmed;
  }

  /**
   * Three-way confirmation used specifically for deleting a message,
   * matching DELETE /api/Messages/{messageId} vs /{messageId}/everyone.
   */
  async confirmDeleteMessage(): Promise<'me' | 'everyone' | 'cancel'> {
    const result = await this.fire({
      icon: 'question',
      title: 'حذف الرسالة',
      text: 'هل تريد حذف هذه الرسالة لنفسك فقط أم لجميع المشاركين؟',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'حذف للجميع',
      denyButtonText: 'حذف لي فقط',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: this.errorColor,
      denyButtonColor: this.primaryColor,
      cancelButtonColor: this.outlineColor,
      reverseButtons: true,
    });
    if (result.isConfirmed) return 'everyone';
    if (result.isDenied) return 'me';
    return 'cancel';
  }

  private fire(options: SweetAlertOptions) {
    // The UI is Arabic/RTL, so every dialog opens with dir="rtl" set on the popup.
    return Swal.fire({
      ...options,
      didOpen: (popup) => popup.setAttribute('dir', 'rtl'),
    });
  }
}
