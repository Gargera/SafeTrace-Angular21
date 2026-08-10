import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
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

type CopyField = 'phone' | 'email';

@Component({
  selector: 'app-view-profile-popup',
  standalone: true,
  imports: [CommonModule, RoleBadgeDirective, VerificationBadgeDirective],
  templateUrl: './view-profile-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:keydown.tab)': 'onTabKey($event)',
  },
})
export class ViewProfilePopup {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly geocodingService = inject(GeocodingService);
  protected chatService = inject(ChatService);

  /**
   * Id of the user to show. The popup is considered "open" whenever this is
   * non-null — the parent controls visibility simply by setting/clearing it.
   * Example (parent template, triggered by clicking the avatar or the name):
   *   <img (click)="selectedUserId.set(user.id)" ... />
   *   <span (click)="selectedUserId.set(user.id)">{{ user.fullName }}</span>
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

  /** Which field's value was just copied — drives the transient "copied" state. */
  readonly copiedField = signal<CopyField | null>(null);

  readonly isOpen = computed(() => this.userId() !== null);

  readonly initials = computed(() => {
    const name = this.profile()?.fullName?.trim();
    if (!name) return '';
    const [first, second] = name.split(/\s+/).filter(Boolean);
    return ((first?.[0] ?? '') + (second?.[0] ?? '')).toUpperCase();
  });

  /** Human-readable Arabic address resolved from lat/lng */
  readonly resolvedAddress = signal<string | null>(null);
  readonly isResolvingAddress = signal(false);

  // Template refs used for the focus trap / initial focus.
  readonly dialogPanel = viewChild<ElementRef<HTMLElement>>('dialogPanel');
  readonly closeButtonRef = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  private lastRequestedId: string | null = null;
  private lastFocusedElement: HTMLElement | null = null;
  private copiedTimeoutId?: ReturnType<typeof setTimeout>;

  constructor() {
    // Refetch whenever a new userId flows in.
    effect(() => {
      const id = this.userId();

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
      this.geocodingService
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

    // Lock background scroll and manage focus whenever the popup opens/closes.
    effect((onCleanup) => {
      if (this.isOpen()) {
        this.lastFocusedElement = document.activeElement as HTMLElement | null;
        document.body.style.overflow = 'hidden';

        // Wait a tick so the dialog panel exists in the DOM before focusing it.
        const focusTimeoutId = setTimeout(() => this.closeButtonRef()?.nativeElement.focus());
        onCleanup(() => clearTimeout(focusTimeoutId));
      } else {
        document.body.style.overflow = '';
        this.lastFocusedElement?.focus();
        this.lastFocusedElement = null;
      }

      onCleanup(() => {
        document.body.style.overflow = '';
      });
    });

    this.destroyRef.onDestroy(() => {
      if (this.copiedTimeoutId) clearTimeout(this.copiedTimeoutId);
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

  /** Rudimentary focus trap: keeps Tab/Shift+Tab cycling within the dialog. */
  onTabKey(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    const panel = this.dialogPanel()?.nativeElement;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, a[href], input, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onImageError(event: Event): void {
    // Broken image URL -> fall back to the initials avatar instead of a
    // broken-image icon.
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    this.profile.update((p) => (p ? { ...p, profileImage: null } : p));
  }

  /** Copies phone/email to the clipboard and shows a brief confirmation. */
  copy(field: CopyField, value: string | null | undefined): void {
    if (!value || !navigator.clipboard) return;

    navigator.clipboard.writeText(value).then(() => {
      this.copiedField.set(field);
      if (this.copiedTimeoutId) clearTimeout(this.copiedTimeoutId);
      this.copiedTimeoutId = setTimeout(() => this.copiedField.set(null), 1500);
    });
  }
}
