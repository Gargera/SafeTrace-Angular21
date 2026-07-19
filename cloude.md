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
import { environment } from '../../../../environments/environment.development';
import { UserRole } from '../../enums/user-role';
import { ApiResponse } from '../../models/responses/api-response.model';
import { GeocodingService } from '../../../core/services/geocoding.service';

export interface VisitUserDTO {
fullName: string;
profileImage: string | null;
role: UserRole;
phoneNumber: string;
email: string;
homeLatitude: number | null;
homeLongitude: number | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
Admin: 'مسؤول',
Moderator: 'مشرف',
VerifiedUser: 'حساب موثّق',
User: 'عضو',
};

// Tailwind's scanner only picks up class names it can see literally in
// source, so this lookup must spell every class out in full — no
// `bg-${role}` string-building.
const ROLE_STYLES: Record<UserRole, { badge: string; dot: string }> = {
Admin: {
badge: 'bg-secondary-container text-on-secondary',
dot: 'bg-secondary',
},
Moderator: {
badge: 'bg-primary-container text-secondary-fixed',
dot: 'bg-primary',
},
VerifiedUser: {
badge: 'bg-tertiary-container text-tertiary-fixed',
dot: 'bg-on-tertiary-container',
},
User: {
badge: 'bg-surface-container-high text-on-surface-variant',
dot: 'bg-outline',
},
};

@Component({
selector: 'app-view-profile-popup',
standalone: true,
imports: [CommonModule],
templateUrl: './view-profile-popup.html',
changeDetection: ChangeDetectionStrategy.OnPush,
host: {
'(document:keydown.escape)': 'onEscape()',
},
})
export class ViewProfilePopup {
private readonly http = inject(HttpClient);
private readonly destroyRef = inject(DestroyRef);

/**

- Id of the user to show. The popup is considered "open" whenever this is
- non-null — the parent controls visibility simply by setting/clearing it.
- Example (parent template):
- <img (click)="selectedUserId.set(user.id)" ... />
- <app-view-profile-popup
-     [userId]="selectedUserId()"
-     (closed)="selectedUserId.set(null)" />

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

readonly roleLabel = computed(() => {
const role = this.profile()?.role;
return role ? ROLE_LABELS[role] : '';
});

readonly roleBadgeClass = computed(() => {
const role = this.profile()?.role;
return role ? ROLE_STYLES[role].badge : '';
});

readonly roleDotClass = computed(() => {
const role = this.profile()?.role;
return role ? ROLE_STYLES[role].dot : '';
});

private lastRequestedId: string | null = null;

readonly #geocodingService = inject(GeocodingService);

/** Human-readable Arabic address resolved from lat/lng */
readonly resolvedAddress = signal<string | null>(null);
readonly isResolvingAddress = signal(false);
constructor() {
// Refetch automatically whenever a new userId flows in. Using an effect
// (rather than ngOnChanges) keeps this reactive to signal-based inputs
// and avoids redundant calls if the same id is set twice in a row.

    effect(() => {
      const id = this.userId();

      if (!id) {
        this.lastRequestedId = null;
        this.profile.set(null);
        this.error.set(null);
        this.loading.set(false);
        return;
      }

      if (id === this.lastRequestedId) return;
      this.lastRequestedId = id;
      this.fetchProfile(id);
      const info = this.profile();
      if (info?.homeLatitude && info?.homeLongitude) {
        this.isResolvingAddress.set(true);
        this.#geocodingService.reverseGeocode(info.homeLatitude, info.homeLongitude).subscribe({
          next: (address) => {
            this.resolvedAddress.set(address);
            this.isResolvingAddress.set(false);
          },
          error: () => {
            this.resolvedAddress.set('تعذر تحميل العنوان');
            this.isResolvingAddress.set(false);
          },
        });
      } else {
        this.resolvedAddress.set(null);
      }
    });

}

private fetchProfile(id: string): void {
this.loading.set(true);
this.error.set(null);
this.profile.set(null);

    this.http
      .get<ApiResponse<VisitUserDTO>>(`${environment.apiBaseUrl}/User/GetVisitedUserInfo/${id}`)
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
export interface VisitUserDTO {
fullName: string;
profileImage: string | null;
role: UserRole;
phoneNumber: string;
email: string;
homeLatitude: number | null;
homeLongitude: number | null;
}

@if (isOpen()) {
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-5 bg-on-background/45 backdrop-blur-sm animate-in fade-in duration-150"
    (click)="onBackdropClick($event)"
  >
    <div
      class="relative w-full max-w-[340px] rounded-[1.25rem] border border-outline-variant/30 bg-surface-container-lowest p-6 pt-7 shadow-2xl"
      role="dialog"
      aria-modal="true"
      dir="rtl"
      [attr.aria-label]="profile()?.fullName || 'الملف الشخصي'"
    >
      <button
        type="button"
        (click)="close()"
        aria-label="إغلاق"
        class="absolute top-3 left-3 grid h-8 w-8 place-items-center rounded-[9999px] bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2"
      >
        <span class="material-symbols-outlined material-icon-sm">close</span>
      </button>

      @if (loading()) {
        <div class="flex flex-col items-center pt-1" aria-live="polite" aria-busy="true">
          <div
            class="mb-4 h-24 w-24 animate-pulse rounded-[9999px] bg-surface-container-high"
          ></div>
          <div class="mb-2.5 h-4 w-2/3 animate-pulse rounded-full bg-surface-container-high"></div>
          <div class="mb-4 h-3 w-1/3 animate-pulse rounded-full bg-surface-container-high"></div>
          <div class="mb-4 h-px w-full bg-outline-variant/50"></div>
          <div class="h-3.5 w-full animate-pulse rounded-full bg-surface-container-high"></div>
        </div>
      } @else if (error()) {
        <div class="flex flex-col items-center px-1 pb-1 pt-4 text-center" role="alert">
          <span class="material-symbols-outlined mb-2 text-[30px] text-error">error</span>
          <p class="mb-4 text-sm text-on-surface">{{ error() }}</p>
          <button
            type="button"
            (click)="retry()"
            class="rounded-[9999px] bg-primary px-5 py-2 text-[13.5px] font-semibold text-on-primary transition-[filter,transform] hover:brightness-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-2"
          >
            إعادة المحاولة
          </button>
        </div>
      } @else if (profile(); as p) {
        <div class="flex flex-col items-center text-center">
          <div class="relative mb-3.5">
            @if (p.profileImage) {
              <img
                class="h-24 w-24 rounded-[9999px] border-4 border-surface-container-lowest bg-surface-container object-cover shadow-sm"
                [src]="p.profileImage"
                [alt]="p.fullName"
                (error)="onImageError($event)"
                loading="lazy"
              />
            } @else {
              <div
                class="grid h-24 w-24 place-items-center rounded-[9999px] border-4 border-surface-container-lowest bg-primary-container text-2xl font-bold text-on-primary-container shadow-sm"
                aria-hidden="true"
              >
                {{ initials() }}
              </div>
            }
            <span
              class="absolute bottom-0.5 left-0.5 h-4 w-4 rounded-[9999px] border-2 border-surface-container-lowest"
              [class]="roleDotClass()"
            ></span>
          </div>

          <h2 class="mb-2 text-lg font-bold leading-snug text-on-surface">
            {{ p.fullName }}
          </h2>

          <span
            class="inline-flex items-center rounded-[9999px] px-3 py-0.5 text-[12.5px] font-semibold"
            [class]="roleBadgeClass()"
          >
            {{ roleLabel() }}
          </span>

          <div class="my-4.5 h-px w-full bg-outline-variant/50"></div>
          <!-- phone nuumber -->
          <dl class="w-full">
            <div class="flex items-center justify-between gap-3">
              <dt class="flex items-center gap-1.5 text-[13px] font-medium text-on-surface-variant">
                <span class="material-symbols-outlined material-icon-sm">call</span>
                <span>رقم الهاتف</span>
              </dt>
              <dd class="text-sm font-semibold text-on-surface" dir="ltr">
                @if (p.phoneNumber) {
                  <a class="text-secondary hover:underline" [href]="'tel:' + p.phoneNumber">
                    {{ p.phoneNumber }}
                  </a>
                } @else {
                  <span class="font-medium text-on-surface-variant">غير متوفر</span>
                }
              </dd>
            </div>
          </dl>
          <!-- Email -->
          <dl class="w-full">
            <div class="flex items-center justify-between gap-3">
              <dt class="flex items-center gap-1.5 text-[13px] font-medium text-on-surface-variant">
                <span class="material-symbols-outlined material-icon-sm">mail</span>
                <span>البريد الالكتروني</span>
              </dt>
              <dd class="text-sm font-semibold text-on-surface" dir="ltr">
                @if (p.email) {
                  <a class="text-secondary hover:underline" [href]="'email:' + p.email">
                    {{ p.email }}
                  </a>
                } @else {
                  <span class="font-medium text-on-surface-variant">غير متوفر</span>
                }
              </dd>
            </div>
          </dl>
          <!-- Home -->
        </div>
      }
    </div>

  </div>
}
