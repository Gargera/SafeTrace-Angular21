import { Component,ElementRef,ViewChild, inject , OnInit, signal, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe,CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { MessageService } from '../../services/message.service';
import { ChatAlertsService } from '../../services/chat-alert.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { ChatHubService, MessagesReadEvent, MessageDeletedEvent} from '../../services/chat-hub.service';
import { AuthService } from '../../../../core/services/auth.service';
import {ChatDetailsDto} from '../../models/chat.model';
import { MessageDto } from '../../models/message.model';
import { FileType } from '../../../../shared/enums/file-type';
import { environment } from '../../../../../environments/environment';
import { Location } from '@angular/common';
import { ViewProfilePopup } from '../../../../shared/components/view-profile-popup/view-profile-popup';
import { ChatSkeletonComponent } from '../../../../shared/components/skeletons/chat-skeleton/chat-skeleton.component';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { validateImageFile} from '../../../../shared/validators/image-validation.validator';
import { validateVideoFile } from '../../../../shared/validators/video-validation.validator';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';
@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [FormsModule, DatePipe, ViewProfilePopup, ChatSkeletonComponent,
    CommonModule
  ],
  templateUrl: './chat-window.html',
})
export class ChatWindow implements OnInit {
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

  isAdmin = false;

  isLoading = signal<boolean>(true);
  messagesLoaded = signal(false);
  chat = signal<ChatDetailsDto | null>(null);
  messages = signal<MessageDto[]>([]);
  page = signal<number>(1);
  hasMoreMessages = signal<boolean>(false);
  chatId = 0;

  draft = signal<string>('');
  selectedFile = signal<File | null>(null);
  fileError = signal<string | null>(null);
  sending = signal<boolean>(false);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;


  async ngOnInit(): Promise<void> {
    this.route.data.subscribe(data => {
      this.isAdmin = data['mode'] === 'admin';
    });

    this.chatId = Number(this.route.snapshot.paramMap.get('chatId'));
    if(!this.chatId) {
      return;
    }

    this.isLoading.set(true);

    const chatDetailsRequest = this.isAdmin
      ? this.chatService.getChatDetailsForAdmin(this.chatId)
      : this.chatService.getChatDetails(this.chatId);

    chatDetailsRequest.subscribe({
      next: (res) => {
        this.chat.set(res.data);
        this.checkLoadingStatus();
      },
      error: (err) => {
        this.snackbarService.error(
         extractErrorMessage(err, 'تعذر تحميل بيانات المحادثة')
        );
        this.isLoading.set(false);
      },
    });


    await this.chatHubService.start();
    await this.chatHubService.joinChat(this.chatId);
    this.chatHubService.onReceiveMessage(this.handleReceivedMessage);
    this.chatHubService.onMessagesRead(this.handleMessagesRead);
    this.chatHubService.onMessageDeletedForEveryone(this.handleMessageDeletedForEveryone);

    this.loadMessages();
  }

// ngAfterViewInit(): void {
//   setTimeout(() => {
//     this.scrollToBottom();
//   });
// }

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
  }

  private normalizeMessage(message: MessageDto):MessageDto{
    return{...message,isMine:message.senderId === this.currentUserId};
  }

  private handleReceivedMessage = (message: MessageDto) : void => {
    if(message.chatId !== this.chatId) {
      return;
    }
    
    const normalized = this.normalizeMessage(message);

    this.addOrUpdateMessage(normalized);

    if(!normalized.isMine){
      setTimeout(() => {
        this.markAsRead();
      }, 300);
    }
    
    if(!this.normalizeMessage(message).isMine){
      this.markAsRead();
    }
  };

  private handleMessagesRead = (event: MessagesReadEvent) : void => {

    if(event.chatId !== this.chatId || event.userId === this.currentUserId) {
      return;
    }
    this.messages.update(messages =>
    messages.map(message => {

      if(message.senderId === this.currentUserId)
      {
        return {
          ...message,
          isRead:true
        };
      }

      return message;

    })
    );
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
  isRead: updated[index].isRead || message.isRead
};

    return updated;
  });
}

private handleMessageDeletedForEveryone = (
  event: MessageDeletedEvent
): void => {

  if(event.chatId !== this.chatId){
    return;
  }

  this.messages.update((msgs)=>
    msgs.map(msg =>
      msg.id === event.messageId
      ?
      {
        ...msg,
        isDeletedForEveryone:true,
        content: this.isAdmin 
          ? msg.content 
          : "تم حذف هذه الرسالة",
          filePath: undefined,
          fileType: undefined,
        forEveryoneDeletedAt:event.deletedAt
      }
      :
      msg
    )
  );

};
  loadMessages(): void {
    const messagesRequest = this.isAdmin
  ? this.chatService.getMessagesForAdmin(this.chatId)
  : this.chatService.getMessages(this.chatId);

  messagesRequest.subscribe({
    next: (res) => {
      const incomingMessages = res.data!.map((m) =>
        this.normalizeMessage(m)
      );

      this.messages.update(current => {
        const currentMap = new Map(
          current.map(m => [m.id, m])
        );

        return incomingMessages.map(message => {
          const oldMessage = currentMap.get(message.id);

          return {
            ...message,
            isRead: oldMessage?.isRead ?? message.isRead
          };
        });
      });

      this.hasMoreMessages.set(false);
      this.messagesLoaded.set(true);
      this.checkLoadingStatus();

      if (!this.isAdmin) {
        this.markAsRead();
      }

      setTimeout(() => {
        this.scrollToBottom();
      });
    },
    error: (err) => {
      this.snackbarService.error(
        extractErrorMessage(err, 'تعذر تحميل الرسائل')
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

  get adminSenderName(): string {
  return this.chat()?.senderName ?? '';
  }

  get adminReceiverName(): string {
    return this.chat()?.receiverName ?? '';
  }

  get adminSenderImage(): string | undefined {
    return this.chat()?.senderImage;
  }

  get adminReceiverImage(): string | undefined {
    return this.chat()?.receiverImage;
  }

  openFilePicker(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    const file = input.files?.[0] ?? null;
    if(!file) {
      this.fileError.set(null);
      return;
    }
    
    let validation;

    if (file.type.startsWith('image/')) {
      validation = validateImageFile(file);
    } else if (file.type.startsWith('video/')) {
      validation = validateVideoFile(file);
    } else {
      this.fileError.set('نوع الملف غير مدعوم.');
      this.selectedFile.set(null);
      input.value = '';
      return;
    }   

    if (!validation.valid) {
      this.fileError.set(validation.errorMessage!);
      this.selectedFile.set(null);
      input.value = ''; // Reset the input so the same file can be selected again
      return;
    }
    this.fileError.set(null);
    this.selectedFile.set(file);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.fileError.set(null);
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
        error: (err) => {

          this.snackbarService.error(
            extractErrorMessage(err, 'تعذر إرسال الرسالة، تحقق من الاتصال وحاول مرة أخرى'));
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

    error: (err) => {
      this.snackbarService.error(
        extractErrorMessage(err, 'تعذر حذف الرسالة، حاول مرة أخرى')
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
openProfile(userId?: string): void {

  const id = userId ?? this.chat()?.otherUserId;

  if (!id) {
    return;
  }

  if (this.isAdmin) {
    this.router.navigate(['/admin/users', id]);
    return;
  }

  this.selectedUserId.set(id);
}

goToCaseDetails(caseId: number, caseType: string): void {
  if(this.isAdmin){
    switch(caseType) {

    case 'Urgent':
      this.router.navigate(['/admin/urgent', caseId]);
      break;

    case 'LongTerm':
      this.router.navigate(['/admin/long-term', caseId]);
      break;

    case 'Unknown':
      this.router.navigate(['/admin/unknown', caseId]);
      break;
    }
  }
  else{

  switch(caseType) {

    case 'Urgent':
      this.router.navigate(['/urgent', caseId]);
      break;

    case 'LongTerm':
      this.router.navigate(['/long-term', caseId]);
      break;

    case 'Unknown':
      this.router.navigate(['/unknown', caseId]);
      break;
  }
}
}

getRelativeTime(date?: string): string {
  if (!date) return '';

  const deletedDate = new Date(date);
  const now = new Date();

  const diffMs = now.getTime() - deletedDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'منذ لحظات';
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 30) return `منذ ${diffDays} يوم`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `منذ ${diffMonths} شهر`;

  const diffYears = Math.floor(diffMonths / 12);
  return `منذ ${diffYears} سنة`;
}

isMessageOnRightSide(message: MessageDto): boolean {
  if (this.isAdmin) {
    return message.senderId === this.chat()?.senderId;
  }
  return message.isMine;
}

}