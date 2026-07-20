import { Component,ElementRef,ViewChild, inject , OnInit, signal, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { MessageService } from '../../services/message.service';
import { ChatAlertsService } from '../../services/chat-alert.service';
import { SnackbarService } from '../../../../core/services/toast.service';
import { ChatHubService, MessagesReadEvent, MessageDeletedEvent} from '../../services/chat-hub.service';
import { AuthService } from '../../../../core/services/auth.service';
import {ChatDetailsDto} from '../../models/chat.model';
import { MessageDto } from '../../models/message.model';
import { FileType } from '../../../../shared/enums/file-type';
import { environment } from '../../../../../environments/environment';
import { Location } from '@angular/common';
import { ViewProfilePopup } from '../../../../shared/components/view-profile-popup/view-profile-popup';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';


@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [FormsModule, DatePipe, ViewProfilePopup,LoadingSpinnerComponent],
  templateUrl: './chat-window.html',
})
export class ChatWindow implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  protected chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private chatAlertsService = inject(ChatAlertsService);
  private snackbarService = inject(SnackbarService);
  private chatHubService = inject(ChatHubService);
  private authService = inject(AuthService);

  readonly selectedUserId = signal<string | null>(null);

  private currentUserId = this.authService.getCurrentUserId();
  readonly FileType = FileType;

  isLoading = signal<boolean>(true);
  messagesLoaded = signal(false);
  chat = signal<ChatDetailsDto | null>(null);
  messages = signal<MessageDto[]>([]);
  page = signal<number>(1);
  hasMoreMessages = signal<boolean>(false);
  chatId = 0;

  draft = signal<string>('');
  selectedFile = signal<File | null>(null);
  sending = signal<boolean>(false);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;


  async ngOnInit(): Promise<void> {
      console.log("CURRENT USER ID:", this.currentUserId);

    this.chatId = Number(this.route.snapshot.paramMap.get('chatId'));
    if(!this.chatId) {
      return;
    }

    this.isLoading.set(true);
    this.chatService.getChatDetails(this.chatId).subscribe({
      next: (res) => {
        console.log(res.data);
        this.chat.set(res.data);
        this.checkLoadingStatus();
      },
      error: (err) => {
        this.snackbarService.error(
         err.error?.message ?? 'تعذر تحميل بيانات المحادثة'
        );
        this.isLoading.set(false);
      },
    });

    this.loadMessages();

    await this.chatHubService.start();
    await this.chatHubService.joinChat(this.chatId);
    this.chatHubService.onReceiveMessage(this.handleReceivedMessage);
    this.chatHubService.onMessagesRead(this.handleMessagesRead);
    this.chatHubService.onMessageDeletedForEveryone(this.handleMessageDeletedForEveryone);

    this.markAsRead();
  }

ngAfterViewInit(): void {
  setTimeout(() => {
    this.scrollToBottom();
  });
}

  async ngOnDestroy(): Promise<void> {
    this.chatHubService.offReceiveMessage(this.handleReceivedMessage);
    this.chatHubService.offMessagesRead(this.handleMessagesRead);
    this.chatHubService.offMessageDeletedForEveryone(
    this.handleMessageDeletedForEveryone
  );
    await this.chatHubService.leaveChat(this.chatId);
  }

  private markAsRead() : void{
    this.messageService.markMessageAsRead(this.chatId).subscribe();
    this.chatHubService.markAsRead(this.chatId);
  }

  private normalizeMessage(message: MessageDto):MessageDto{
    console.log({
    senderId: message.senderId,
    currentUserId: this.currentUserId,
    isMine: message.senderId === this.currentUserId
  });
    return{...message,isMine:message.senderId === this.currentUserId};
  }

  private handleReceivedMessage = (message: MessageDto) : void => {
    if(message.chatId !== this.chatId) {
      return;
    }
    
    this.addOrUpdateMessage(this.normalizeMessage(message));
    setTimeout(() => {
    this.scrollToBottom();
    });
    console.log(
    "After SignalR:",
    this.messages().find(m => m.id === message.id)?.sendAt
  );

    if(!this.normalizeMessage(message).isMine){
      this.markAsRead();
    }
  };

  private handleMessagesRead = (event: MessagesReadEvent) : void => {
    if(event.chatId !== this.chatId || event.userId === this.currentUserId) {
      return;
    }
    this.messages.update((current) =>
    current.map((m) => (m.senderId === this.currentUserId ? { ...m, isRead: true } : m)));
  };

  private addOrUpdateMessage(message: MessageDto): void {
  this.messages.update((current) => {
    const index = current.findIndex((m) => m.id === message.id);

    // الرسالة جديدة
    if (index === -1) {
      return [...current, message];
    }

    // الرسالة موجودة -> حدث بياناتها
    const updated = [...current];
    updated[index] = {
      ...updated[index],
      ...message,
    };

    return updated;
  });
}

private handleMessageDeletedForEveryone = (
  event: MessageDeletedEvent
): void => {

  if(event.chatId !== this.chatId) {
    return;
  }

  this.messages.update((msgs) =>
    msgs.map((msg) =>
      msg.id === event.messageId
        ? {
            ...msg,
            isDeletedForEveryone: true,
            content: 'تم حذف هذه الرسالة'
          }
        : msg
    )
  );
};
  loadMessages(): void {
    this.chatService.getMessages(this.chatId).subscribe({
      next: (res) => {
        this.messages.set(res.data!.map((m) => this.normalizeMessage(m)));
        this.hasMoreMessages.set(false);
        this.messagesLoaded.set(true);
        this.checkLoadingStatus();
        setTimeout(() => {
        this.scrollToBottom();
        });
      },
      error: (err) => {
      this.snackbarService.error(
      err.error?.message ?? 'تعذر تحميل الرسائل'
      );
      this.isLoading.set(false);
    }
    });
  }

  attachmentUrl(message: MessageDto): string | null {
    if(!message.filePath) return null;
    const fileBaseUrl = environment.baseUrl;
    return `${fileBaseUrl}/${message.filePath}`;
  }

  get displayName(): string {
    const c = this.chat();
    if (!c) {
      return '';
    }
    return c.otherUserName ?? c.receiverName ?? c.senderName ?? c.receiverId;
  }

  openFilePicker(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.fileInput.nativeElement.value = '';
  }

  onSend() : void {
    if (this.sending()) {
      return; // a send is already in flight - ignore extra Enter/click triggers
    }

    const text = this.draft().trim();
    const file = this.selectedFile();
    if (!text && !file) {
      return;
    }

    this.sending.set(true);

    this.messageService.sendMessage({chatId: this.chatId, content: text || undefined, file: file || undefined})
    .subscribe({
      next: (res) => {
      console.log("API MESSAGE", res.data);
      console.log(typeof res.data!.fileType, res.data!.fileType);
      console.log(typeof res.data!.sendAt);
      console.log(res.data!.sendAt);
        const message = res.data;

      if (message != null) {
        this.addOrUpdateMessage(this.normalizeMessage(message));
        setTimeout(() => {
        this.scrollToBottom();
        });
      }
        this.sending.set(false);
        //this.loadMessages();
      },
        error: () => {this.snackbarService.error('تعذر إرسال الرسالة، تحقق من الاتصال وحاول مرة أخرى');
          this.sending.set(false);
        }
    });

    this.draft.set('');
    this.clearSelectedFile();
  }

 async onDeleteMessage(message: MessageDto): Promise<void> {
  const choice = await this.chatAlertsService.confirmDeleteMessage(message.isMine);

  if (choice === 'cancel') {
    return;
  }

  const request$ = choice === 'everyone'
    ? this.messageService.deleteMessageForEveryone(message.id)
    : this.messageService.deleteMessageForMe(message.id);

  request$.subscribe({
    next: (res) => {

      if (choice === 'me') {
        // حذف الرسالة عندي فقط
        this.messages.update((msgs) =>
          msgs.filter((msg) => msg.id !== message.id)
        );
      }

      // لو everyone:
      // لا نعدل هنا
      // SignalR event هو اللي هيحدث الرسالة عند الطرفين

    this.snackbarService.success(res.message);
    },

    error: () => {
      this.snackbarService.error(
        'تعذر حذف الرسالة، حاول مرة أخرى'
      );
    },
  });
}

  // async onDeleteChat(): Promise<void> {
  //   const confirmed = await this.chatAlertsService.confirm(
  //     'حذف المحادثة',
  //     'سيتم حذف هذه المحادثة من قائمتك فقط، ولن تظهر لك مرة أخرى.'
  //   );
  //   if (!confirmed) {
  //     return;
  //   }

  //   this.chatService.deleteChatForMe(this.chatId).subscribe({
  //     next: () => {
  //       this.chatAlertsService.success('تم حذف المحادثة');
  //       this.router.navigate(['/chat/conversations']);
  //     },
  //     error: () => this.chatAlertsService.error('تعذر حذف المحادثة، حاول مرة أخرى'),
  //   });
  // }

   goBack(): void {
    this.location.back();
  }

  private scrollToBottom(): void {
  const element = this.messagesContainer?.nativeElement;

  if (element) {
    element.scrollTop = element.scrollHeight;
  }
}

  private checkLoadingStatus(): void{
    if(this.chat() && this.messagesLoaded()){
      this.isLoading.set(false);
    }
  }

  isNewDay(index: number): boolean{
    const msgs = this.messages();

    if(index === 0){
      return true;
    }

    const current = new Date (msgs[index].sendAt);
    const previous = new Date (msgs[index-1].sendAt);

    return(current.getFullYear() !== previous.getFullYear()||
    current.getMonth() !== previous.getMonth() ||
    current.getDate() !== previous.getDate()
  );
  }
  formatDay(date: string | Date): string {

  const d = new Date(date);

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'اليوم';
  }

  if (d.toDateString() === yesterday.toDateString()) {
    return 'أمس';
  }

  return d.toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
openProfile(): void {
    console.log(this.chat());

  const userId = this.chat()?.otherUserId;
    console.log(userId);

  if (!userId) return;

  this.selectedUserId.set(userId);
}

}