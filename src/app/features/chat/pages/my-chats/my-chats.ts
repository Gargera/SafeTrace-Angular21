import { Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { ChatAlertsService } from '../../services/chat-alert.service';
import { ChatSummaryDto } from '../../models/chat.model';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';
type ConversationFilter = 'all' | 'unread';

const UI_STATE_CACHE_KEY = 'MyChats_UI_State';
 


@Component({
  selector: 'app-my-chats',
  imports: [CommonModule, RouterModule, ButtonComponent, LoadingSpinnerComponent, ConfirmationModalComponent],
  templateUrl: './my-chats.html',
})
export class MyChats implements OnInit {
  protected chatService = inject(ChatService);
  private chatAlerts = inject(ChatAlertsService);
  private router = inject(Router);
  private snackbarService = inject(SnackbarService);
  private cacheService = inject(CacheService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  chats = signal<ChatSummaryDto[]>([]);
  activeFilter = signal<ConversationFilter>('all');

  showDeleteModal = signal(false);
  chatToDelete = signal<ChatSummaryDto | null>(null);
  deleting = signal(false);
 
  readonly filterTabs: { key: ConversationFilter; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'unread', label: 'غير مقروء' },
  ];
 
  filteredChats = computed(() => {
    const chats = this.chats();
    return this.activeFilter() === 'unread' ? chats.filter((c) => c.unreadCount > 0) : chats;
  });
 
  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cacheService.set(
        UI_STATE_CACHE_KEY,
        { 
          activeFilter: this.activeFilter(),
          showDeleteModal: this.showDeleteModal(),
          chatToDelete: this.chatToDelete()
        },
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    });
  }

  ngOnInit(): void {
    const cachedState = this.cacheService.get<any>(UI_STATE_CACHE_KEY);
    if (cachedState) {
      if (cachedState.activeFilter) this.activeFilter.set(cachedState.activeFilter);
      
      if (cachedState.showDeleteModal && cachedState.chatToDelete) {
        this.chatToDelete.set(cachedState.chatToDelete);
        this.showDeleteModal.set(true);
      }
    }

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
  openDeleteModal(chat: ChatSummaryDto): void {
  this.chatToDelete.set(chat);
  this.showDeleteModal.set(true);
}

closeDeleteModal(): void {
  this.showDeleteModal.set(false);
  this.chatToDelete.set(null);
}
 
confirmDeleteChat(): void {
  const chat = this.chatToDelete();

  if (!chat) {
    return;
  }

  this.deleting.set(true);

  this.chatService.deleteChatForMe(chat.chatId).subscribe({
    next: () => {
      this.chats.update(current =>
        current.filter(c => c.chatId !== chat.chatId)
      );

      this.deleting.set(false);

      const cachedState = this.cacheService.get<any>(UI_STATE_CACHE_KEY) || {};
      cachedState.showDeleteModal = false;
      cachedState.chatToDelete = null;
      this.cacheService.set(UI_STATE_CACHE_KEY, cachedState, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);

      this.closeDeleteModal();

      this.snackbarService.success('تم حذف المحادثة');
    },
    error: () => {
      this.deleting.set(false);
      this.snackbarService.error('تعذر حذف المحادثة، حاول مرة أخرى');
    }
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
