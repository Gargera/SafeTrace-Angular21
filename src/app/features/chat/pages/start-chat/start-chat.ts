import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import {ChatAlertsService} from '../../services/chat-alert.service';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { StartChatContextDto } from '../../models/chat.model';
import { Location } from '@angular/common';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-start-chat',
  standalone: true,
  imports: [LoadingSpinnerComponent],
  templateUrl: './start-chat.html',
})
export class StartChat implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  protected chatService = inject(ChatService);
  private chatAlertsService = inject(ChatAlertsService);
  private snackbarService = inject(SnackbarService);
  chat = signal<StartChatContextDto | null>(null);
  loading = signal(true);

  private caseId!: number;

  ngOnInit(): void {
    this.caseId = Number(this.route.snapshot.paramMap.get('caseId'));
     console.log(this.route.snapshot.paramMap.get('caseId'));

    if (!this.caseId) {
      this.loading.set(false);
      return;
    }
    this.chatService.startChat(this.caseId).subscribe({
      next:(res) => {
        this.chat.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.chatAlertsService.error(
        err.error?.message ?? "لا يمكنك بدء محادثة على حالتك الخاصة."
        ).then(() => {this.location.back();  });
            
      }
    });
  }

  // goToChatWindow(): void {
  //   const chat = this.chat();
  //   if(!chat) return;

  //   this.router.navigate(['/chat/chat', chat.chatId]);
  // }

  startOrContinueChat(): void {
    this.chatService.createChat({
      caseId: this.caseId
    })
    .subscribe({
      next: (res) => {
        if (!res.data) {
        this.snackbarService.error('لم يتم إنشاء المحادثة');
        return;
      }
        // this.snackbarService.success(res.message);

        this.router.navigate(['/chat/chat', res.data.chatId]);
      },
      error: (err) => {
        this.snackbarService.error(err.error?.message || 'حدث خطأ أثناء بدء المحادثة');
      }
    });
  }

  
}
