import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'app-case-notification-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './case-notification-modal.html',
})
export class CaseNotificationModalComponent {
  readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  get activeNotification() {
    return this.notificationService.activeCaseNotification();
  }

  closeModal(): void {
    this.notificationService.closeCaseNotificationModal();
  }

  onPrimaryAction(): void {
    const active = this.activeNotification;
    if (!active) return;

    this.closeModal();

    if (active.kind === 'approved') {
      if (active.detailsUrl) {
        this.router.navigateByUrl(active.detailsUrl);
      }
    } else if (active.kind === 'rejected') {
      if (active.updateUrl) {
        this.router.navigateByUrl(active.updateUrl);
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
  }
}
