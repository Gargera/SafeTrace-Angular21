import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProfileSidebar } from '../../shared/components/profile-sidebar/profile-sidebar';
import { ChatTab } from './tabs/chat-tab/chat-tab';
import { EditProfile } from './tabs/Edit-profile/edit-profile';
import { NotificationsTab } from './tabs/notifications-tab/notifications-tab';
import { ReportsTab } from './tabs/reports-tab/reports-tab';
import { GetUserInfoDTO } from '../../core/models/profile.model';
import { NotificationService } from '../../core/services/notification.service';
import { ProfileService } from '../../core/services/profile.service';

export type ProfileTab = 'edit' | 'reports' | 'chat' | 'notifications';

@Component({
  selector: 'app-profile-view',
  imports: [
    RouterModule,
    ProfileSidebar,
    EditProfile,
    NotificationsTab,
    ReportsTab,
    ChatTab,
  ],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.css',
})
export class ProfileView implements OnInit, OnDestroy {
  readonly #profileService = inject(ProfileService);
  readonly #notificationService = inject(NotificationService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  readonly userInfo = signal<GetUserInfoDTO | null>(null);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly activeTab = signal<ProfileTab>('edit');

  readonly tabs: { id: ProfileTab; label: string }[] = [
    { id: 'edit', label: 'تعديل البيانات' },
    { id: 'reports', label: 'بلاغاتي' },
    { id: 'chat', label: 'المحادثات' },
    { id: 'notifications', label: 'الإشعارات' },
  ];

  ngOnInit(): void {
    // Read tab from query param
    this.#route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab') as ProfileTab | null;
      if (tab && this.tabs.some((t) => t.id === tab)) {
        this.activeTab.set(tab);
      }
    });

    this.#loadUserInfo();
    this.#notificationService.startConnection();
  }

  ngOnDestroy(): void {
    this.#notificationService.stopConnection();
  }

  switchTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  onProfileUpdated(updated: GetUserInfoDTO): void {
    this.userInfo.set(updated);
  }

  #loadUserInfo(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.#profileService.getUserInfo().subscribe({
      next: (data) => {
        this.userInfo.set(data.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.loadError.set('تعذّر تحميل بيانات الملف الشخصي. يرجى إعادة المحاولة.');
        this.isLoading.set(false);
        console.error('Load user info error:', err);
      },
    });
  }

  get notificationUnreadCount() {
    return this.#notificationService.unreadCount;
  }
}
