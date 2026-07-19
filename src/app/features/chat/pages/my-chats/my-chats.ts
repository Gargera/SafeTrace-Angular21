import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { ChatAlertsService } from '../../services/chat-alert.service';
import { ChatSummaryDto } from '../../models/chat.model';
import { ButtonComponent } from '../../../../shared/components/button/button';


/**
 * A view-only filter for this page. Not a backend concept - GetUserChatsAsync
 * has no filter parameter at all, it just returns every non-deleted chat for
 * the current user. 'active' and 'archived' from the first version are gone
 * because ChatSummaryDto has no isArchived field to filter on; only 'all'
 * and 'unread' are backed by real data (unreadCount).
 */
type ConversationFilter = 'all' | 'unread';
 
/**
 * MyConversationsComponent
 * --------------------------
 * The "الرسائل والمحادثات" list page. Loads all of the current user's chats
 * once (GET /api/Chats -> ApiResponse<ChatSummaryDto[]>) and filters
 * client-side, since the endpoint returns everything in one call.
 *
 * NOTE: the conversation-card was previously a separate
 * `app-conversation-card` component (ConversationCardComponent). It has been
 * merged/inlined directly into this component's template, so it no longer
 * exists as its own file/component - DatePipe is imported here instead since
 * the inlined markup uses the `date` pipe directly.
 *
 * IMPORTANT (carried over from the old card component): ChatSummaryDto only
 * has `otherUserId` (a raw user id string), `caseId` (a raw number),
 * `lastMessage`, `lastMessageDate`, and `unreadCount` - there's no display
 * name, avatar, or case title on this DTO. The render stays plain until one
 * of the following is added:
 *   - the backend adds those fields to ChatSummaryDto, or
 *   - the frontend does a separate lookup (e.g. a users/{id} endpoint)
 *     and joins it in this page.
 */


@Component({
  selector: 'app-my-chats',
  imports: [DatePipe, ButtonComponent],
  templateUrl: './my-chats.html',
})
export class MyChats implements OnInit {
  protected chatService = inject(ChatService);
  private chatAlerts = inject(ChatAlertsService);
  private router = inject(Router);
 
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
    this.chatService.getMyChats().subscribe({
      next: (response) => {
        console.log(response.data!);
        this.chats.set(response.data!);
      },
      error: () => this.chatAlerts.error('تعذر تحميل المحادثات'),
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
        this.chatAlerts.success('تم حذف المحادثة');
      },
      error: () => this.chatAlerts.error('تعذر حذف المحادثة، حاول مرة أخرى'),
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
