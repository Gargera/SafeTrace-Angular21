import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // 1. قمنا باستيراد الـ FormsModule هنا
import { ChatService } from '../../services/chat.service';
import { ChatAlertsService } from '../../services/chat-alert.service';
import { AdminChatsDto, ChatFilterDto } from '../../models/chat.model';
import { AdminChatStatisticsDto } from '../../models/admin-chat-statistics-dto';
import { CardComponent } from '../../../../shared/components/card/card';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { CaseHeaderComponent } from '../../../../shared/components/cases-components/case-header/case-header.component';
import {CaseTypeBadgeDirective} from '../../../../shared/directives/case-type-badge-directive';
import {TruncatePipe} from '../../../../shared/pipes/truncate-pipe';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { Permissions } from '../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
const PAGE_SIZE = 10;

@Component({
  selector: 'app-admin-chats',
  imports: [
    DatePipe,
    CommonModule,
    FormsModule,
    CardComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    FormField,
    ButtonComponent,
    ConfirmationModalComponent,
    CaseHeaderComponent,
    CaseTypeBadgeDirective,
    TruncatePipe,
    HasPermissionDirective,
    PaginationComponent
  ],
  templateUrl: './admin-chats.html',
})
export class AdminChats implements OnInit {
  private chatService = inject(ChatService);
  private chatAlerts = inject(ChatAlertsService);
  private router = inject(Router);
  private snackbarService = inject(SnackbarService);
  Permissions = Permissions;
  chatActionPermissions = [
    Permissions.Chat.GetById,
    Permissions.Chat.HardDelete
  ];
  readonly pageSize = PAGE_SIZE;

  // Signals الأساسية
  chats = signal<AdminChatsDto[]>([]);
  totalCount = signal(0);
  currentPage = signal(1); // تم تغيير الاسم ليتطابق مع الـ template (currentPage)
  searchTerm = signal('');
  isLoading = signal(false); // سجنال التحميل لربطها بالـ Spinner

  showDeleteModal = signal(false);
  selectedChatToDelete = signal<AdminChatsDto | null>(null);
  // فلاتر إضافية (التاريخ + حالة الحذف)
  fromDate = signal<string>('');
  toDate = signal<string>('');
  isDeletedBySender = signal<boolean | undefined>(undefined);
  isDeletedByReceiver = signal<boolean | undefined>(undefined);

  // حالة فتح/قفل حوار الفلترة
  showFilterDialog = signal(false);

  // هل فيه فلاتر مفعّلة حالياً (لعرض badge على زر الفلترة)
  hasActiveFilters = computed(() =>
    !!this.fromDate() ||
    !!this.toDate() ||
    this.isDeletedBySender() !== undefined ||
    this.isDeletedByReceiver() !== undefined
  );
  // حسابات الـ Pagination تلقائياً بناءً على الـ Signals
  totalPages = computed(() => Math.ceil(this.totalCount() / PAGE_SIZE));

  statistics = signal<AdminChatStatisticsDto | null>(null);
  isLoadingStats = signal(true);

  ngOnInit(): void {
    this.loadStatistics();
    this.loadChats();
  }

  private loadStatistics(): void {
    this.isLoadingStats.set(true);
    this.chatService.getAdminStatistics().subscribe({
      next: (response) => {
        this.statistics.set(response.data!);
        this.isLoadingStats.set(false);
      },
      error: () => {
        this.isLoadingStats.set(false);
      }
    });
  }

  private loadChats(): void {
    this.isLoading.set(true);
    const filter: ChatFilterDto = {
       search: this.searchTerm() || undefined ,
       fromDate:this.fromDate() || undefined,
       toDate: this.toDate() || undefined,
       isDeletedBySender: this.isDeletedBySender(),
      isDeletedByReceiver: this.isDeletedByReceiver(),
      };

    this.chatService.getAllChatsForAdmin(this.currentPage(), PAGE_SIZE, filter).subscribe({
      next: (response) => {
        this.chats.set(response.data?.items || []);
        this.totalCount.set(response.data?.totalCount || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackbarService.error('تعذر تحميل المحادثات');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1); // إعادة التعيين للصفحة الأولى عند البحث
    this.loadChats();
  }

  toggleFilterDialog(): void {
    this.showFilterDialog.update((v) => !v);
  }

  applyFilters(): void {
    this.currentPage.set(1);
    this.loadChats();
    this.showFilterDialog.set(false);
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.isDeletedBySender.set(undefined);
    this.isDeletedByReceiver.set(undefined);
    this.currentPage.set(1);
    this.loadChats();
    this.showFilterDialog.set(false);
  }

  changePage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages()) {
      this.currentPage.set(pageNumber);
      this.loadChats();
    }
  }

  openChat(chat: AdminChatsDto): void {
    this.router.navigate(['/admin/chats', chat.chatId]);
  }

  // async hardDeleteChat(chat: AdminChatsDto, event: Event): Promise<void> {
  //   event.stopPropagation(); // لمنع فتح الشات عند الضغط على زر الحذف
    
  //   const confirmed = await this.chatAlerts.confirm(
  //     'حذف المحادثة نهائياً',
  //     `سيتم حذف المحادثة رقم ${chat.chatId} نهائياً ولا يمكن التراجع عن هذا الإجراء.`
  //   );
    
  //   if (!confirmed) {
  //     return;
  //   }

  //   this.chatService.hardDeleteChat(chat.chatId).subscribe({
  //     next: () => {
  //       this.chats.update((current) => current.filter((c) => c.chatId !== chat.chatId));
  //       // تقليل العدد الإجمالي لتحديث العدادات فوراً في الكروت والـ pagination
  //       this.totalCount.update(count => count - 1);
  //       this.chatAlerts.success('تم حذف المحادثة نهائياً');
  //     },
  //     error: () => this.chatAlerts.error('تعذر حذف المحادثة، حاول مرة أخرى'),
  //   });
  // }

  openDeleteModal(chat: AdminChatsDto, event: Event): void {
  event.stopPropagation();

  this.selectedChatToDelete.set(chat);
  this.showDeleteModal.set(true);
}
confirmDeleteChat(): void {
  const chat = this.selectedChatToDelete();

  if (!chat) return;

  this.chatService.hardDeleteChat(chat.chatId).subscribe({
    next: () => {
      this.chats.update(current =>
        current.filter(c => c.chatId !== chat.chatId)
      );

      this.totalCount.update(count => count - 1);

      this.snackbarService.success('تم حذف المحادثة نهائياً');

      this.closeDeleteModal();
    },
    error: () => {
      this.snackbarService.error('تعذر حذف المحادثة، حاول مرة أخرى');
    }
  });
}

closeDeleteModal(): void {
  this.showDeleteModal.set(false);
  this.selectedChatToDelete.set(null);
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
}