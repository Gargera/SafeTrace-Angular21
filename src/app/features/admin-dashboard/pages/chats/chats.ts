import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { ChatService } from '../../../chat/services/chat.service';
import { ChatAlertsService } from '../../../chat/services/chat-alert.service';
import { AdminChatsDto, ChatFilterDto } from '../../../chat/models/chat.model';
import { AdminChatStatisticsDto } from '../../../chat/models/admin-chat-statistics-dto';
import { CardComponent } from '../../../../shared/components/card/card';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FormField } from '../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CaseTypeBadgeDirective } from '../../../../shared/directives/case-type-badge.directive';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import { SnackbarService } from '../../../../shared/services/toast.service';
import { Permissions } from '../../../../core/constants/Permissions';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination';
import { TableSkeletonComponent } from '../../../../shared/components/skeletons/table-skeleton/table-skeleton.component';
import { CacheService } from '../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../core/cache/cache.constants';
import { extractErrorMessage } from '../../../../shared/helper/error.helper';

const PAGE_SIZE = 10;
const UI_STATE_CACHE_KEY = 'AdminChats_UI_State';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [
    DatePipe,
    CommonModule,
    FormsModule,
    CardComponent,
    EmptyStateComponent,
    FormField,
    ButtonComponent,
    ConfirmationModalComponent,
    HeaderComponent,
    CaseTypeBadgeDirective,
    TruncatePipe,
    HasPermissionDirective,
    PaginationComponent,
    TableSkeletonComponent
  ],
  templateUrl: './chats.html',
})
export class AdminChats implements OnInit {
  private chatService = inject(ChatService);
  private chatAlerts = inject(ChatAlertsService);
  private router = inject(Router);
  private snackbarService = inject(SnackbarService);
  private cacheService = inject(CacheService);
  private destroyRef = inject(DestroyRef);
  Permissions = Permissions;
  chatActionPermissions = [
    Permissions.Chat.GetById,
    Permissions.Chat.HardDelete
  ];
  readonly pageSize = PAGE_SIZE;

  // Signals
  chats = signal<AdminChatsDto[]>([]);
  totalCount = signal(0);
  currentPage = signal(1);
  searchTerm = signal('');
  isLoading = signal(false);
  isDeleting = signal(false);

  showDeleteModal = signal(false);
  selectedChatToDelete = signal<AdminChatsDto | null>(null);

  // Date and status filters
  fromDate = signal<string>('');
  toDate = signal<string>('');
  isDeletedBySender = signal<boolean | undefined>(undefined);
  isDeletedByReceiver = signal<boolean | undefined>(undefined);

  showFilterDialog = signal(false);

  hasActiveFilters = computed(() =>
    !!this.searchTerm() ||
    !!this.fromDate() ||
    !!this.toDate() ||
    this.isDeletedBySender() !== undefined ||
    this.isDeletedByReceiver() !== undefined
  );

  totalPages = computed(() => Math.ceil(this.totalCount() / PAGE_SIZE));

  statistics = signal<AdminChatStatisticsDto | null>(null);
  isLoadingStats = signal(true);

  today = new Date().toISOString().split('T')[0];

  fromDateError = computed(() => {
    const from = this.fromDate();
    if (!from) return '';
    if (from > this.today) return 'لا يمكن اختيار تاريخ في المستقبل';
    if (this.toDate() && from > this.toDate()) return 'يجب أن يكون تاريخ البداية قبل تاريخ النهاية';
    return '';
  });

  toDateError = computed(() => {
    const to = this.toDate();
    if (!to) return '';
    if (to > this.today) return 'لا يمكن اختيار تاريخ في المستقبل';
    if (this.fromDate() && to < this.fromDate()) return 'يجب أن يكون تاريخ النهاية بعد تاريخ البداية';
    return '';
  });

  hasDateErrors = computed(() =>
    !!this.fromDateError() || !!this.toDateError()
  );

  private searchSubject = new Subject<string>();
  private readonly fetchTrigger$ = new Subject<void>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cacheService.set(
        UI_STATE_CACHE_KEY,
        {
          searchTerm: this.searchTerm(),
          fromDate: this.fromDate(),
          toDate: this.toDate(),
          isDeletedBySender: this.isDeletedBySender(),
          isDeletedByReceiver: this.isDeletedByReceiver(),
          currentPage: this.currentPage()
        },
        CACHE_TTL.UI_STATE,
        [CACHE_TAGS.UI_STATE]
      );
    });
  }

  ngOnInit(): void {
    const cachedState = this.cacheService.get<any>(UI_STATE_CACHE_KEY);

    if (cachedState) {
      this.searchTerm.set(cachedState.searchTerm || '');
      this.fromDate.set(cachedState.fromDate || '');
      this.toDate.set(cachedState.toDate || '');
      this.isDeletedBySender.set(cachedState.isDeletedBySender);
      this.isDeletedByReceiver.set(cachedState.isDeletedByReceiver);
      this.currentPage.set(cachedState.currentPage || 1);
    }

    this.setupFetchPipeline();
    this.loadStatistics();

    // Initial fetch
    this.loadChats();

    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term: string) => {
        this.searchTerm.set(term);
        this.currentPage.set(1);
        this.loadChats();
      });
  }

  private loadStatistics(): void {
    this.isLoadingStats.set(true);
    this.chatService.getAdminStatistics().subscribe({
      next: (response) => {
        this.statistics.set(response.data!);
        this.isLoadingStats.set(false);
      },
      error: (err) => {
        this.isLoadingStats.set(false);
        this.snackbarService.error(extractErrorMessage(err, 'تعذر تحميل إحصائيات المحادثات'));
      }
    });
  }

  private loadChats(): void {
    this.fetchTrigger$.next();
  }

  private setupFetchPipeline(): void {
    this.fetchTrigger$
      .pipe(
        tap(() => this.isLoading.set(true)),
        switchMap(() => {
          const filter: ChatFilterDto = {
            search: this.searchTerm() || undefined,
            fromDate: this.fromDate() || undefined,
            toDate: this.toDate() || undefined,
            isDeletedBySender: this.isDeletedBySender(),
            isDeletedByReceiver: this.isDeletedByReceiver(),
          };

          return this.chatService.getAllChatsForAdmin(this.currentPage(), PAGE_SIZE, filter).pipe(
            catchError((err) => {
              this.snackbarService.error(extractErrorMessage(err, 'تعذر تحميل المحادثات'));
              this.chats.set([]);
              this.totalCount.set(0);
              this.isLoading.set(false);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        if (response && response.data) {
          this.chats.set(response.data.items || []);
          this.totalCount.set(response.data.totalCount || 0);
        }
        this.isLoading.set(false);
      });
  }

  onSearch(value: string): void {
    this.searchSubject.next(value);
  }

  toggleFilterDialog(): void {
    this.showFilterDialog.update((v) => !v);
  }

  applyFilters(): void {
    if (this.hasDateErrors()) {
      return;
    }
    this.currentPage.set(1);
    this.loadChats();
    this.showFilterDialog.set(false);
  }

  resetFilters(): void {
    this.cacheService.remove(UI_STATE_CACHE_KEY);
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

  openDeleteModal(chat: AdminChatsDto, event: Event): void {
    event.stopPropagation();
    this.selectedChatToDelete.set(chat);
    this.showDeleteModal.set(true);
  }

  confirmDeleteChat(): void {
    const chat = this.selectedChatToDelete();
    if (!chat || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.chatService.hardDeleteChat(chat.chatId).subscribe({
      next: () => {
        this.chats.update(current =>
          current.filter(c => c.chatId !== chat.chatId)
        );

        this.totalCount.update(count => Math.max(0, count - 1));
        this.snackbarService.success('تم حذف المحادثة نهائياً');

        this.isDeleting.set(false);
        this.closeDeleteModal();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.snackbarService.error(extractErrorMessage(err, 'تعذر حذف المحادثة، حاول مرة أخرى'));
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
