import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { GetUserNotificationsDTO, NotificationPage } from '../models/notification.model';
import { NotificationType } from '../../shared/enums/Notification-Type';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../shared/models/responses/api-response.model';

const DEFAULT_PAGE_SIZE = 10;

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiBaseUrl}/Notification`;
  readonly #authService = inject(AuthService);
  // ─── Private state signals ────────────────────────────────────────────────
  readonly #notifications = signal<GetUserNotificationsDTO[]>([]);
  readonly #unreadCount = signal<number>(0);
  readonly #isConnected = signal<boolean>(false);
  readonly #isLoading = signal<boolean>(false);

  // ─── Pagination signals ───────────────────────────────────────────────────
  readonly #currentPage = signal<number>(1);
  readonly #totalPages = signal<number>(1);
  readonly #totalCount = signal<number>(0);

  // ─── Public readonly signals ──────────────────────────────────────────────
  readonly notifications = this.#notifications.asReadonly();
  readonly unreadCount = this.#unreadCount.asReadonly();
  readonly isConnected = this.#isConnected.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();
  readonly currentPage = this.#currentPage.asReadonly();
  readonly totalPages = this.#totalPages.asReadonly();
  readonly totalCount = this.#totalCount.asReadonly();

  readonly hasUnread = computed(() => this.#unreadCount() > 0);
  readonly hasPrevPage = computed(() => this.#currentPage() > 1);
  readonly hasNextPage = computed(() => this.#currentPage() < this.#totalPages());

  #hubConnection: signalR.HubConnection | null = null;

  // ─── SignalR Connection ───────────────────────────────────────────────────

  startConnection(): void {
    if (this.#hubConnection) return;

    this.#hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalRHubUrl, {
        // Cookie-based auth: credentials are sent automatically.
        // If you switch to bearer token in the future, provide it here:
        // accessTokenFactory: () => tokenService.getToken()
        accessTokenFactory: () => this.#authService.getToken() ?? '',
        // withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(
        environment.production ? signalR.LogLevel.Error : signalR.LogLevel.Information,
      )
      .build();

    this.#registerHubEvents();
    this.#connect();
  }

  #connect(): void {
    this.#hubConnection
      ?.start()
      .then(() => {
        console.log('SignalR Connected');
        console.log('State:', this.#hubConnection?.state);
        console.log('ConnectionId:', this.#hubConnection?.connectionId);
        this.#isConnected.set(true);
        // Load notifications via SignalR after connection
        this.#hubConnection
          ?.invoke('Test')
          .then(() => console.log('Invoke Success'))
          .catch((err) => console.error('Invoke Error', err));
        this.#hubConnection?.invoke('GetMyNotifications', 1, DEFAULT_PAGE_SIZE);
      })
      .catch((err) => {
        console.error('SignalR connection error:', err);

        this.#isConnected.set(false);
      });
  }

  #registerHubEvents(): void {
    if (!this.#hubConnection) return;

    // Fired on connect with current unread count
    this.#hubConnection.on('UnreadCount', (response: ApiResponse<number>) => {
      this.#unreadCount.set(response.data ?? 0);
    });
    // Fired after invoking GetMyNotifications

    this.#hubConnection.on('ReceiveNotifications', (response: ApiResponse<NotificationPage>) => {
      if (response.success && response.data) {
        this.#notifications.set(response.data.items);
        this.#currentPage.set(response.data.page);
        this.#totalPages.set(response.data.totalPages);
        this.#totalCount.set(response.data.totalCount);
      }
    });

    // Fired when a new notification is pushed from server
    this.#hubConnection.on('ReceiveNotification', (notification: GetUserNotificationsDTO) => {
      console.log('ReceiveNotification Fired', notification);

      this.#notifications.update((prev) => [notification, ...prev]);

      this.#totalCount.update((c) => c + 1);
      this.#totalPages.set(Math.ceil(this.#totalCount() / DEFAULT_PAGE_SIZE));
    });

    // Reconnection lifecycle hooks
    this.#hubConnection.onreconnecting(() => this.#isConnected.set(false));
    this.#hubConnection.onreconnected(() => {
      this.#isConnected.set(true);
      this.#hubConnection?.invoke('GetMyNotifications', 1, 10).catch(console.error);
    });
    this.#hubConnection.onclose(() => this.#isConnected.set(false));
  }

  // ─── Hub Invocations ──────────────────────────────────────────────────────

  markAsRead(notificationId: number): void {
    // Optimistic update
    this.#notifications.update((list) =>
      list.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );
    this.#hubConnection?.invoke('MarkAsRead', notificationId).catch((err) => {
      console.error('MarkAsRead failed:', err);
      // Rollback on error
      this.#notifications.update((list) =>
        list.map((n) => (n.id === notificationId ? { ...n, isRead: false } : n)),
      );
    });
  }

  markAllAsRead(): void {
    // Optimistic update
    this.#notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.#unreadCount.set(0);

    this.#hubConnection
      ?.invoke('MarkAllAsRead')
      .catch((err) => console.error('MarkAllAsRead failed:', err));
  }

  removeNotification(notificationId: number): void {
    // Optimistic update
    const removed = this.#notifications().find((n) => n.id === notificationId);
    this.#notifications.update((list) => list.filter((n) => n.id !== notificationId));
    this.#totalCount.update((c) => Math.max(0, c - 1));
    if (removed && !removed.isRead) {
      this.#unreadCount.update((c) => Math.max(0, c - 1));
    }

    this.#hubConnection?.invoke('RemoveNotification', notificationId).catch((err) => {
      console.error('RemoveNotification failed:', err);
      // Rollback
      if (removed) {
        this.#notifications.update((list) => [removed, ...list]);
        this.#totalCount.update((c) => c + 1);
        if (!removed.isRead) {
          this.#unreadCount.update((c) => c + 1);
        }
      }
    });
  }

  // ─── REST API Fallback (used if SignalR is not connected) ─────────────────
  loadPage(page: number, append = false): void {
    this.#isLoading.set(true);

    const params = new HttpParams().set('page', page).set('pageSize', DEFAULT_PAGE_SIZE);

    this.#http
      .get<ApiResponse<NotificationPage>>(`${this.#apiUrl}/my-Notifications`, { params })
      .subscribe({
        next: (res) => {
          const data = res.data;

          if (!data) {
            this.#notifications.set([]);
            this.#currentPage.set(1);
            this.#totalPages.set(0);
            this.#totalCount.set(0);
            this.#isLoading.set(false);
            return;
          }

          if (append) {
            this.#notifications.update((old) => {
              const merged = [...old, ...data.items];
              return merged;
            });
          } else {
            this.#notifications.set(data.items);
          }

          this.#currentPage.set(data.page);
          this.#totalPages.set(data.totalPages);
          this.#totalCount.set(data.totalCount);

          this.#isLoading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.#isLoading.set(false);
        },
      });
  }
  loadMore(): void {
    if (this.#isLoading()) return;

    if (!this.hasNextPage()) return;

    this.loadPage(this.#currentPage() + 1, true);
  }

  stopConnection(): void {
    this.#hubConnection?.stop().catch(console.error);
    this.#hubConnection = null;
    this.#isConnected.set(false);
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }

  getNotificationDetails(n: GetUserNotificationsDTO): {
    icon: string;
    bgClass: string;
    title: string;
  } {
    const text = (n.content || '').toLowerCase();
    const type = n.type;

    // 1. Verification
    if (
      text.includes('توثيق') ||
      text.includes('وثائق') ||
      text.includes('الهوية') ||
      text.includes('verification') ||
      text.includes('identity')
    ) {
      return { icon: 'verified', bgClass: 'bg-cyan-500', title: 'توثيق الحساب' };
    }

    // 2. Security
    if (
      text.includes('أمان') ||
      text.includes('كلمة المرور') ||
      text.includes('رمز الدخول') ||
      text.includes('security') ||
      text.includes('password')
    ) {
      return { icon: 'security', bgClass: 'bg-rose-500', title: 'الأمان والحماية' };
    }

    // 3. Order
    if (text.includes('طلب') || text.includes('ترتيب') || text.includes('order')) {
      return { icon: 'assignment', bgClass: 'bg-orange-500', title: 'تفاصيل الطلب' };
    }

    // 4. Profile
    if (text.includes('الملف الشخصي') || text.includes('بياناتك') || text.includes('profile')) {
      return { icon: 'person', bgClass: 'bg-indigo-500', title: 'الملف الشخصي' };
    }

    // 5. Success
    if (
      text.includes('نجاح') ||
      text.includes('تم بنجاح') ||
      text.includes('تم قبول') ||
      text.includes('تم تفعيل') ||
      text.includes('success') ||
      text.includes('accepted')
    ) {
      return { icon: 'check_circle', bgClass: 'bg-emerald-500', title: 'عملية ناجحة' };
    }

    // 6. Error / Complaint
    if (
      type === NotificationType.Complaint ||
      text.includes('خطأ') ||
      text.includes('فشل') ||
      text.includes('شكوى') ||
      text.includes('error') ||
      text.includes('failed')
    ) {
      return { icon: 'error', bgClass: 'bg-red-500', title: 'تنبيه خطأ / شكوى' };
    }

    // 7. Warning
    if (text.includes('تحذير') || text.includes('تنبيه') || text.includes('warning')) {
      return { icon: 'warning', bgClass: 'bg-amber-500', title: 'تحذير هام' };
    }

    // 8. Message
    if (
      type === NotificationType.Message ||
      text.includes('رسالة') ||
      text.includes('محادثة') ||
      text.includes('chat') ||
      text.includes('message')
    ) {
      return { icon: 'chat', bgClass: 'bg-teal-500', title: 'رسالة جديدة' };
    }

    // 9. System
    if (
      type === NotificationType.System ||
      text.includes('نظام') ||
      text.includes('system') ||
      text.includes('تحديث')
    ) {
      return { icon: 'settings', bgClass: 'bg-slate-500', title: 'تحديث النظام' };
    }

    // 10. Default Information or MatchFound
    if (type === NotificationType.MatchFound) {
      return { icon: 'person_search', bgClass: 'bg-indigo-500', title: 'تم العثور على تطابق' };
    }

    return { icon: 'info', bgClass: 'bg-blue-500', title: 'إشعار جديد' };
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'Z'); // اعتبره UTC

    const diff = Date.now() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'منذ لحظات';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 30) return `منذ ${days} يوم`;

    return date.toLocaleDateString('ar-EG');
  }
}
