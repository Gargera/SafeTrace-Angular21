import { Component, inject, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { GetUserNotificationsDTO } from '../../../../core/models/notification.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { NotificationType } from '../../../../shared/enums/Notification-Type';
import { NotificationSkeletonComponent } from '../../../../shared/components/skeletons/notification-skeleton/notification-skeleton.component';

@Component({
  selector: 'app-notifications-tab',
  imports: [NotificationSkeletonComponent],
  standalone: true,
  templateUrl: './notifications-tab.html',
  styleUrl: './notifications-tab.css',
})
export class NotificationsTab implements OnInit {
  readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly NotificationType = NotificationType;

  onNotificationClick(n: GetUserNotificationsDTO, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.notificationService.handleNotificationClick(n, this.router);
  }

  ngOnInit(): void {
    // If SignalR is not connected, fall back to HTTP load
    // SignalR loads page 1 automatically via GetMyNotifications on connect.
    // Fall back to HTTP if SignalR is not connected.
    if (!this.notificationService.isConnected()) {
      this.notificationService.loadPage(1);

      // this.notificationService.loadNotificationsViaHttp();//old code
    }
  }

  getNotificationIcon(n: GetUserNotificationsDTO): string {
    return this.notificationService.getNotificationDetails(n).icon;
  }

  getNotificationIconBg(n: GetUserNotificationsDTO): string {
    return this.notificationService.getNotificationDetails(n).bgClass;
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

  @HostListener('window:scroll')
  onScroll(): void {
    const threshold = 100;
    
    // Window scroll calculation
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const reachedBottom = documentHeight - scrollPosition <= threshold;

    if (
      reachedBottom &&
      !this.notificationService.isLoadingMore() &&
      this.notificationService.hasNextPage()
    ) {
      this.notificationService.loadMore();
    }
  }
}
