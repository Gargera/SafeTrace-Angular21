import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UserRole } from '../../enums/user-role';
import { ApiResponse } from '../../models/responses/api-response.model';
import { GeocodingService } from '../../../core/services/geocoding/geocoding.service';
import { ChatService } from '../../../features/chat/services/chat.service';
import { ROLE_TRANSLATIONS_AR } from '../../../core/constants/dictionaries/roles.dictionary';
import { RoleBadgeDirective } from '../../directives/role-badge-directive';
import { VerificationBadgeDirective } from '../../directives/verification-badge-directive';

export interface VisitUserDTO {
  fullName: string;
  profileImage: string | null;
  role: UserRole;
  verificationStatus: string;
  phoneNumber: string;
  email: string;
  homeLatitude: number | null;
  homeLongitude: number | null;
}

@Component({
  selector: 'app-view-profile-popup',
  standalone: true,
  imports: [CommonModule, RoleBadgeDirective],
  templateUrl: './view-profile-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ViewProfilePopup {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  protected chatService = inject(ChatService);

  /**
   * Id of the user to show. The popup is considered "open" whenever this is
   * non-null — the parent controls visibility simply by setting/clearing it.
   * Example (parent template):
   *   <img (click)="selectedUserId.set(user.id)" ... />
   *   <app-view-profile-popup
   *     [userId]="selectedUserId()"
   *     (closed)="selectedUserId.set(null)" />
   */
  readonly userId = input<string | null>(null);

  /** Emitted on backdrop click, Escape key, or the close button. */
  readonly closed = output<void>();

  readonly profile = signal<VisitUserDTO | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly isOpen = computed(() => this.userId() !== null);

  readonly initials = computed(() => {
    const name = this.profile()?.fullName?.trim();
    if (!name) return '';
    const [first, second] = name.split(/\s+/).filter(Boolean);
    return ((first?.[0] ?? '') + (second?.[0] ?? '')).toUpperCase();
  });

  private lastRequestedId: string | null = null;

  readonly #geocodingService = inject(GeocodingService);

  /** Human-readable Arabic address resolved from lat/lng */
  readonly resolvedAddress = signal<string | null>(null);
  readonly isResolvingAddress = signal(false);
  constructor() {
    // Refetch whenever a new userId flows in.

    effect(() => {
      const id = this.userId();
      console.log(this.profile());

      if (!id) {
        this.lastRequestedId = null;
        this.profile.set(null);
        this.error.set(null);
        this.loading.set(false);
        this.resolvedAddress.set(null);
        return;
      }

      if (id === this.lastRequestedId) return;
      this.lastRequestedId = id;
      this.fetchProfile(id);
    });

    // Reverse-geocode whenever the profile (with coordinates) changes.
    effect(() => {
      const info = this.profile();

      if (!info?.homeLatitude || !info?.homeLongitude) {
        this.resolvedAddress.set(null);
        this.isResolvingAddress.set(false);
        return;
      }

      this.isResolvingAddress.set(true);
      this.#geocodingService
        .reverseGeocode(info.homeLatitude, info.homeLongitude)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (address) => {
            this.resolvedAddress.set(address);
            this.isResolvingAddress.set(false);
          },
          error: () => {
            this.resolvedAddress.set('تعذر تحميل العنوان');
            this.isResolvingAddress.set(false);
          },
        });
    });
  }

  private fetchProfile(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.profile.set(null);

    this.http
      .get<ApiResponse<VisitUserDTO>>(
        `${environment.apiBaseUrl}/UserProfile/GetVisitedUserInfo/${id}`,
      )
      .pipe(
        catchError(() => {
          this.error.set('تعذر تحميل الملف الشخصي، حاول مرة أخرى');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
        // Auto-unsubscribe when the component is destroyed — prevents leaks
        // and stray state updates from in-flight requests.
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res?.data) this.profile.set(res.data);
      });
  }

  retry(): void {
    const id = this.userId();
    if (!id) return;
    this.lastRequestedId = null; // force refetch
    this.fetchProfile(id);
    this.lastRequestedId = id;
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    // Only close when the backdrop itself (not the panel) was clicked.
    if (event.target === event.currentTarget) this.close();
  }

  onEscape(): void {
    if (this.isOpen()) this.close();
  }

  onImageError(event: Event): void {
    // Broken image URL -> fall back to the initials avatar instead of a
    // broken-image icon.
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    this.profile.update((p) => (p ? { ...p, profileImage: null } : p));
  }
}
