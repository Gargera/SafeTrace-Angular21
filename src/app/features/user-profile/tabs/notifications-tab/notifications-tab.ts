import { Component, inject, OnInit } from '@angular/core';
import { GetUserNotificationsDTO } from '../../../../core/models/notification.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { NotificationType } from '../../../../shared/enums/Notification-Type';

@Component({
  selector: 'app-notifications-tab',
  imports: [],
  standalone: true,
  templateUrl: './notifications-tab.html',
  styleUrl: './notifications-tab.css',
})
export class NotificationsTab implements OnInit {
  readonly notificationService = inject(NotificationService);

  readonly NotificationType = NotificationType;

  ngOnInit(): void {
    // If SignalR is not connected, fall back to HTTP load
    // SignalR loads page 1 automatically via GetMyNotifications on connect.
    // Fall back to HTTP if SignalR is not connected.
    if (!this.notificationService.isConnected()) {
      this.notificationService.loadPage(1);

      // this.notificationService.loadNotificationsViaHttp();//old code
    }
  }

  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.MatchFound:
        return 'person_search';
      case NotificationType.Message:
        return 'chat';
      case NotificationType.Complaint:
        return 'report';
      case NotificationType.System:
        return 'info';
      default:
        return 'notifications';
    }
  }

  getNotificationIconBg(type: NotificationType): string {
    switch (type) {
      case NotificationType.MatchFound:
        return 'bg-secondary';
      case NotificationType.Message:
        return 'bg-on-tertiary-container';
      case NotificationType.Complaint:
        return 'bg-error';
      case NotificationType.System:
        return 'bg-primary';
      default:
        return 'bg-primary';
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffD = Math.floor(diffH / 24);

    if (diffH < 1) return 'الآن';
    if (diffH < 24) return `منذ ${diffH} ساعة`;
    if (diffD === 1) return 'أمس';
    if (diffD < 7) return `قبل ${diffD} أيام`;
    return date.toLocaleDateString('ar-SA');
  }

  /** Build an array of page numbers for the pagination bar */
  get pageNumbers(): number[] {
    const total = this.notificationService.totalPages();
    const current = this.notificationService.currentPage();

    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    // Sliding window: always show first, last, current ± 1, and ellipsis gaps
    const pages = new Set<number>([1, total, current, current - 1, current + 1]);
    return Array.from(pages)
      .filter((p) => p >= 1 && p <= total)
      .sort((a, b) => a - b);
  }

  trackById(_: number, item: GetUserNotificationsDTO): number {
    return item.id;
  }
}
