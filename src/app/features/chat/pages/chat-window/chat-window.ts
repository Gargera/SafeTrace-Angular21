import { Component,ElementRef,ViewChild, inject , OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { MessageService } from '../../services/message.service';
import { ChatAlertsService } from '../../services/chat-alert.service';
import { ChatHubService, MessagesReadEvent } from '../../services/chat-hub.service';
import { AuthService } from '../../../../core/services/auth.service';
import {ChatDetailsDto} from '../../models/chat.model';
import { MessageDto } from '../../models/message.model';
import { FileType } from '../../../../shared/enums/file-type';
import { environment } from '../../../../../environments/environment';

const PAGE_SIZE = 30;


@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './chat-window.html',
})
export class ChatWindow implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatService = inject(ChatService);
  private messageService = inject(MessageService);
  private chatAlertsService = inject(ChatAlertsService);
  private chatHubService = inject(ChatHubService);
  private authService = inject(AuthService);


  private currentUserId = this.authService.getCurrentUserId();
  readonly FileType = FileType;

  isLoading = signal<boolean>(true);

  chat = signal<ChatDetailsDto | null>(null);
  messages = signal<MessageDto[]>([]);
  page = signal<number>(1);
  hasMoreMessages = signal<boolean>(false);
  chatId = 0;

  draft = signal<string>('');
  selectedFile = signal<File | null>(null);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;


  async ngOnInit(): Promise<void> {
    this.chatId = Number(this.route.snapshot.paramMap.get('chatId'));
    if(!this.chatId) {
      return;
    }

    this.isLoading.set(true);
    this.chatService.getChatDetails(this.chatId).subscribe({
      next: (res) => {
        this.chat.set(res.data);
        this.checkLoadingStatus();
      },
      error: (err) => {
        this.chatAlertsService.error('تعذر تحميل بيانات المحادثة');
        this.isLoading.set(false);
      },
    });

    this.loadMessages();
    this.markAsRead();

    await this.chatHubService.start();
    await this.chatHubService.joinChat(this.chatId);
    this.chatHubService.onReceiveMessage(this.handleReceivedMessage);
    this.chatHubService.onMessagesRead(this.handleMessagesRead);
  }



  async ngOnDestroy(): Promise<void> {
    this.chatHubService.offReceiveMessage(this.handleReceivedMessage);
    this.chatHubService.offMessagesRead(this.handleMessagesRead);
    await this.chatHubService.leaveChat(this.chatId);
  }

  private markAsRead() : void{
    this.messageService.markMessageAsRead(this.chatId).subscribe();
    this.chatHubService.markAsRead(this.chatId);
  }

  private handleReceivedMessage = (message: MessageDto) : void => {
    if(message.chatId !== this.chatId) {
      return;
    }
    this.addMessageIfNew(message);
  };

  private handleMessagesRead = (event: MessagesReadEvent) : void => {
    if(event.chatId !== this.chatId || event.userId !== this.currentUserId) {
      return;
    }
    this.messages.update((current) =>
    current.map((m) => (m.senderId === this.currentUserId ? { ...m, isRead: true } : m)));
  };

  private addMessageIfNew(message: MessageDto): void {
    const alreadyPresent = this.messages().some((m) => m.id === message.id);
    if (!alreadyPresent) {
      this.messages.update((msgs) => [...msgs, message]);
    }
  }
  loadMessages(): void {
    this.chatService.getMessages(this.chatId, this.page(), PAGE_SIZE).subscribe({
      next: (res) => {
        this.messages.set(res.data!.items);
        const loadedSoFar = res.data!.pageNumber * res.data!.pageSize;
        this.hasMoreMessages.set(loadedSoFar < res.data!.totalCount);
        this.checkLoadingStatus();
      },
      error: (err) =>{ this.chatAlertsService.error('تعذر تحميل الرسائل');
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
    const text = this.draft().trim();
    const file = this.selectedFile();
    if (!text && !file) {
      return;
    }

    this.messageService.sendMessage({chatId: this.chatId, content: text || undefined, file: file || undefined})
    .subscribe({
      next: (res) => {
        const message = res.data;

      if (message == null) {
        return;
      }

      this.messages.update(msgs => [...msgs, message]);
      },
        error: () => this.chatAlertsService.error('تعذر إرسال الرسالة، تحقق من الاتصال وحاول مرة أخرى'),
    });

    this.draft.set('');
    this.clearSelectedFile();
  }

  async onDeleteMessage(messageId: number): Promise<void> {
    const choice = await this.chatAlertsService.confirmDeleteMessage();
    if (choice === 'cancel') {
      return;
    }

    const request$ = choice === 'everyone'
      ? this.messageService.deleteMessageForEveryone(messageId)
      : this.messageService.deleteMessageForMe(messageId);

    request$.subscribe({
      next: () =>{
        this.messages.update((msgs) => msgs.filter((msg) => msg.id !== messageId));
        this.chatAlertsService.success('تم حذف الرسالة '); // change to toast
      },
      error : (err) => this.chatAlertsService.error('تعذر حذف الرسالة، حاول مرة أخرى'),
    });
  }

  async onDeleteChat(): Promise<void> {
    const confirmed = await this.chatAlertsService.confirm(
      'حذف المحادثة',
      'سيتم حذف هذه المحادثة من قائمتك فقط، ولن تظهر لك مرة أخرى.'
    );
    if (!confirmed) {
      return;
    }

    this.chatService.deleteChatForMe(this.chatId).subscribe({
      next: () => {
        this.chatAlertsService.success('تم حذف المحادثة');
        this.router.navigate(['/chat/conversations']);
      },
      error: () => this.chatAlertsService.error('تعذر حذف المحادثة، حاول مرة أخرى'),
    });
  }

   goBack(): void {
    this.router.navigate(['/chat/conversations']);
  }

  private checkLoadingStatus(): void{
    if(this.chat() && this.messages()){
      this.isLoading.set(false);
    }
  }

}