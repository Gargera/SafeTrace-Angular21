import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { GetUserNotificationsDTO } from '../models/notification.model';
import { environment } from '../../../environments/environment.development';
import { AuthService } from './auth.service';
import { ApiResponse } from './profile.service';

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

  // ─── Public readonly signals ──────────────────────────────────────────────
  readonly notifications = this.#notifications.asReadonly();
  readonly unreadCount = this.#unreadCount.asReadonly();
  readonly isConnected = this.#isConnected.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();
  readonly hasUnread = computed(() => this.#unreadCount() > 0);

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
        this.#isConnected.set(true);
        // Load notifications via SignalR after connection
        this.#hubConnection?.invoke('GetMyNotifications').catch(console.error);
      })
      .catch((err) => {
        this.#isConnected.set(false);
        console.error('SignalR connection error:', err);
      });
  }

  #registerHubEvents(): void {
    if (!this.#hubConnection) return;

    // Fired on connect with current unread count
    this.#hubConnection.on('UnreadCount', (count: number) => {
      this.#unreadCount.set(count);
    });

    // Fired after invoking GetMyNotifications

 this.#hubConnection.on(
   'ReceiveNotifications',
   (response: ApiResponse<GetUserNotificationsDTO[]>) => {
     console.log(response);
     console.log(Array.isArray(response));
     this.#notifications.set(response.data);
   },
 );
    // Fired when a new notification is pushed from server
    this.#hubConnection.on('ReceiveNotification', (notification: GetUserNotificationsDTO) => {
      this.#notifications.update((prev) => [notification, ...prev]);
      if (!notification.isRead) {
        this.#unreadCount.update((c) => c + 1);
      }
    });

    // Reconnection lifecycle hooks
    this.#hubConnection.onreconnecting(() => this.#isConnected.set(false));
    this.#hubConnection.onreconnected(() => {
      this.#isConnected.set(true);
      this.#hubConnection?.invoke('GetMyNotifications').catch(console.error);
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
    if (removed && !removed.isRead) {
      this.#unreadCount.update((c) => Math.max(0, c - 1));
    }

    this.#hubConnection?.invoke('RemoveNotification', notificationId).catch((err) => {
      console.error('RemoveNotification failed:', err);
      // Rollback
      if (removed) {
        this.#notifications.update((list) => [removed, ...list]);
        if (!removed.isRead) {
          this.#unreadCount.update((c) => c + 1);
        }
      }
    });
  }

  // ─── REST API Fallback (used if SignalR is not connected) ─────────────────

  loadNotificationsViaHttp(): void {
    this.#isLoading.set(true);
    this.#http.get<GetUserNotificationsDTO[]>(`${this.#apiUrl}/my-Notifications`).subscribe({
      next: (data) => {
        this.#notifications.set(data);
        this.#isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
        this.#isLoading.set(false);
      },
    });
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  stopConnection(): void {
    this.#hubConnection?.stop().catch(console.error);
    this.#hubConnection = null;
    this.#isConnected.set(false);
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }
}
