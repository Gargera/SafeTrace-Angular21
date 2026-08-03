import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { ChatAlertsService } from '../../services/chat-alert.service';
import { ChatSummaryDto } from '../../models/chat.model';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

type ConversationFilter = 'all' | 'unread';
 


@Component({
  selector: 'app-my-chats',
  imports: [CommonModule, RouterModule, ButtonComponent, LoadingSpinnerComponent],
  templateUrl: './my-chats.html',
})
export class MyChats implements OnInit {
  protected chatService = inject(ChatService);
  private chatAlerts = inject(ChatAlertsService);
  private router = inject(Router);
  private snackbarService = inject(SnackbarService);
  loading = signal(true);
  chats = signal<ChatSummaryDto[]>([]);
  activeFilter = signal<ConversationFilter>('all');
 
  readonly filterTabs: { key: ConversationFilter; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'unread', label: 'غير مقروء' },
  ];
 
  filteredChats = computed(() => {
    const chats = this.chats();
    return this.activeFilter() === 'unread' ? chats.filter((c) => c.unreadCount > 0) : chats;
  });
 
  ngOnInit(): void {
    this.loading.set(true);
    this.chatService.getMyChats().subscribe({
      next: (response) => {
        console.log(response.data!);
        this.chats.set(response.data!);
        this.loading.set(false);
      },
      error: () =>{ 
        this.loading.set(false);
        this.snackbarService.error('تعذر تحميل المحادثات');},
    });
  }
 
  setFilter(filter: ConversationFilter): void {
    this.activeFilter.set(filter);
  }
 
  /** ChatSummaryDto has no "hasStarted" flag - every chat in this list already
   *  exists (it was created by StartOrGetChatAsync), so opening one always
   *  goes straight to the conversation screen, never the start-chat page. */
  openChat(chat: ChatSummaryDto): void {
    this.router.navigate(['/chat/chat', chat.chatId]);
  }
 
  /** Called when a card's delete button is clicked (soft delete, for me only). */
  async deleteChat(chat: ChatSummaryDto): Promise<void> {
    const confirmed = await this.chatAlerts.confirm(
      'حذف المحادثة',
      'سيتم حذف هذه المحادثة من قائمتك فقط.'
    );
    if (!confirmed) {
      return;
    }
 
    this.chatService.deleteChatForMe(chat.chatId).subscribe({
      next: () => {
        this.chats.update((current) => current.filter((c) => c.chatId !== chat.chatId));
        this.snackbarService.success('تم حذف المحادثة');
      },
      error: () => this.snackbarService.error('تعذر حذف المحادثة، حاول مرة أخرى'),
    });
  }

  formatLastMessageDate(date: string | Date | null): string {
  if (!date) return '';

  const messageDate = new Date(date);
  const now = new Date();

  // اليوم
  if (messageDate.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat('ar-EG', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(messageDate);
  }

  // أمس
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'أمس';
  }

  // قبل كده
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(messageDate);
}
}
