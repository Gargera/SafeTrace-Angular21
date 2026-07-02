import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment.development';
import { MessageDto, MessagesReadPayload } from '../models/Chat.model';

@Injectable({ providedIn: 'root' })
export class ChatHubService implements OnDestroy {
  // ─── Private state ────────────────────────────────────────────────────────
  readonly #messages = signal<MessageDto[]>([]);
  readonly #isConnected = signal(false);
  readonly #activeChatId = signal<number | null>(null);

  // ─── Public readonly signals ──────────────────────────────────────────────
  readonly messages = this.#messages.asReadonly();
  readonly isConnected = this.#isConnected.asReadonly();
  readonly activeChatId = this.#activeChatId.asReadonly();

  #hub: signalR.HubConnection | null = null;

  // ─── Connection lifecycle ─────────────────────────────────────────────────

  startConnection(): void {
    if (this.#hub) return;

    this.#hub = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.chatHubUrl}`, { withCredentials: true })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(
        environment.production ? signalR.LogLevel.Error : signalR.LogLevel.Information,
      )
      .build();

    this.#registerEvents();
    this.#hub
      .start()
      .then(() => this.#isConnected.set(true))
      .catch((err) => {
        this.#isConnected.set(false);
        console.error('ChatHub connection error:', err);
      });

    this.#hub.onreconnecting(() => this.#isConnected.set(false));
    this.#hub.onreconnected(async () => {
      this.#isConnected.set(true);
      // Rejoin the active chat room after reconnect
      const chatId = this.#activeChatId();
      if (chatId !== null) await this.joinChat(chatId);
    });
    this.#hub.onclose(() => this.#isConnected.set(false));
  }

  stopConnection(): void {
    this.#hub?.stop().catch(console.error);
    this.#hub = null;
    this.#isConnected.set(false);
    this.#activeChatId.set(null);
    this.#messages.set([]);
  }

  // ─── Hub invocations ──────────────────────────────────────────────────────

  async joinChat(chatId: number): Promise<void> {
    // Leave the previous room cleanly before joining a new one
    const prev = this.#activeChatId();
    if (prev !== null && prev !== chatId) {
      await this.leaveChat(prev);
    }

    this.#activeChatId.set(chatId);
    this.#messages.set([]); // clear stale messages

    await this.#hub?.invoke('JoinChat', chatId).catch(console.error);
  }

  async leaveChat(chatId: number): Promise<void> {
    await this.#hub?.invoke('LeaveChat', chatId).catch(console.error);
    if (this.#activeChatId() === chatId) {
      this.#activeChatId.set(null);
    }
  }

  async markAsRead(chatId: number): Promise<void> {
    await this.#hub?.invoke('MarkAsRead', chatId).catch(console.error);
  }

  // ─── Load historical messages into signal (called from component) ─────────

  setMessages(messages: MessageDto[]): void {
    this.#messages.set(messages);
  }

  appendOlderMessages(messages: MessageDto[]): void {
    // Prepend older page to the front, avoid duplicates by messageId
    this.#messages.update((current) => {
      const existingIds = new Set(current.map((m) => m.messageId));
      const fresh = messages.filter((m) => !existingIds.has(m.messageId));
      return [...fresh, ...current];
    });
  }

  // ─── Private event registration ───────────────────────────────────────────

  #registerEvents(): void {
    if (!this.#hub) return;

    // Server pushes a new message to the chat group
    this.#hub.on('ReceiveMessage', (message: MessageDto) => {
      // Only append if it belongs to the currently open chat
      if (message.chatId === this.#activeChatId()) {
        this.#messages.update((list) => [...list, message]);
      }
    });

    // Server broadcasts that a user read the messages in a chat
    this.#hub.on('MessagesRead', (payload: MessagesReadPayload) => {
      if (payload.chatId === this.#activeChatId()) {
        this.#messages.update((list) => list.map((m) => ({ ...m, isRead: true })));
      }
    });
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }
}
