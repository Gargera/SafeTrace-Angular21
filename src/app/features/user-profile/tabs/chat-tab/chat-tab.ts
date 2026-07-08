import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ChatSummaryDto, MessageDto } from '../../../../core/models/Chat.model';

@Component({
  selector: 'app-chat-tab',
  imports: [FormsModule],
  templateUrl: './chat-tab.html',
  styleUrl: './chat-tab.css',
})
export class ChatTab {
  // readonly #chatService = inject(ChatService);
  // readonly chatHub = inject(ChatHubService);
  // // ── State signals ──────────────────────────────────────────────────────────
  // readonly chats = signal<ChatSummaryDto[]>([]);
  // readonly activeChat = signal<ChatSummaryDto | null>(null);
  // readonly isLoadingChats = signal(false);
  // readonly isLoadingMsgs = signal(false);
  // readonly isSending = signal(false);
  // readonly chatsError = signal<string | null>(null);
  // // Pagination for messages
  // readonly msgPage = signal(1);
  // readonly msgTotalPages = signal(1);
  // readonly hasMorePages = computed(() => this.msgPage() < this.msgTotalPages());
  // messageInput = '';
  // // ── Lifecycle ──────────────────────────────────────────────────────────────
  // ngOnInit(): void {
  //   this.chatHub.startConnection();
  //   this.#loadChats();
  // }
  // ngOnDestroy(): void {
  //   const chatId = this.activeChat()?.chatId;
  //   if (chatId) this.chatHub.leaveChat(chatId);
  //   this.chatHub.stopConnection();
  // }
  // // ── Chat list ──────────────────────────────────────────────────────────────
  // #loadChats(): void {
  //   this.isLoadingChats.set(true);
  //   this.chatsError.set(null);
  //   this.#chatService.getUserChats().subscribe({
  //     next: (data) => {
  //       this.chats.set(data);
  //       this.isLoadingChats.set(false);
  //     },
  //     error: () => {
  //       this.chatsError.set('تعذّر تحميل المحادثات. يرجى المحاولة مجدداً.');
  //       this.isLoadingChats.set(false);
  //     },
  //   });
  // }
  // // ── Open a conversation ────────────────────────────────────────────────────
  // async openChat(chat: ChatSummaryDto): Promise<void> {
  //   if (this.activeChat()?.chatId === chat.chatId) return;
  //   this.activeChat.set(chat);
  //   this.msgPage.set(1);
  //   this.isLoadingMsgs.set(true);
  //   await this.chatHub.joinChat(chat.chatId);
  //   this.#loadMessages(chat.chatId, 1);
  //   // Mark messages as read via SignalR
  //   await this.chatHub.markAsRead(chat.chatId);
  //   // Clear unread count in the list optimistically
  //   this.chats.update((list) =>
  //     list.map((c) => (c.chatId === chat.chatId ? { ...c, unreadCount: 0 } : c)),
  //   );
  // }
  // backToList(): void {
  //   const chatId = this.activeChat()?.chatId;
  //   if (chatId) this.chatHub.leaveChat(chatId);
  //   this.activeChat.set(null);
  //   this.messageInput = '';
  // }
  // // ── Messages ───────────────────────────────────────────────────────────────
  // #loadMessages(chatId: number, page: number): void {
  //   this.isLoadingMsgs.set(true);
  //   this.#chatService.getMessages(chatId, page).subscribe({
  //     next: (data) => {
  //       if (page === 1) {
  //         this.chatHub.setMessages(data.items);
  //       } else {
  //         this.chatHub.appendOlderMessages(data.items);
  //       }
  //       this.msgPage.set(data.page);
  //       this.msgTotalPages.set(data.totalPages);
  //       this.isLoadingMsgs.set(false);
  //     },
  //     error: () => {
  //       this.isLoadingMsgs.set(false);
  //     },
  //   });
  // }
  // loadOlderMessages(): void {
  //   const chat = this.activeChat();
  //   if (!chat || !this.hasMorePages()) return;
  //   const nextPage = this.msgPage() + 1;
  //   this.#loadMessages(chat.chatId, nextPage);
  // }
  // // ── Helpers ────────────────────────────────────────────────────────────────
  // formatTime(dateStr: string): string {
  //   return new Date(dateStr).toLocaleTimeString('ar-SA', {
  //     hour: '2-digit',
  //     minute: '2-digit',
  //   });
  // }
  // formatDate(dateStr: string | null): string {
  //   if (!dateStr) return '';
  //   const date = new Date(dateStr);
  //   const now = new Date();
  //   const diffD = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  //   if (diffD === 0) return 'اليوم';
  //   if (diffD === 1) return 'أمس';
  //   if (diffD < 7) return `قبل ${diffD} أيام`;
  //   return date.toLocaleDateString('ar-SA');
  // }
  // trackByMsgId(_: number, msg: MessageDto): number {
  //   return msg.messageId;
  // }
  // trackByChatId(_: number, chat: ChatSummaryDto): number {
  //   return chat.chatId;
  // }
}
