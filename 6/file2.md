\***\*\*\*\*\*\*\***\_\***\*\*\*\*\*\*\***SideBar Html\***\*\*\*\*\*\*\***\_\_\_\***\*\*\*\*\*\*\***

<aside class="md:col-span-3 space-y-gutter">
  <!-- Profile Card -->
  <div class="glass-card rounded-xl p-lg flex flex-col items-center text-center">
    <!-- Avatar -->
    <div class="relative mb-md">
      <div
        class="w-24 h-24 rounded-full overflow-hidden border-4 border-surface-container shadow-sm"
      >
        <img
          [src]="avatarUrl"
          [alt]="userInfo()?.fullName ?? 'User'"
          class="w-full h-full object-cover"
        />
      </div>
      @if (isVerified) {
        <div
          class="absolute -bottom-1 -left-1 bg-on-tertiary-container text-white p-1 rounded-full border-2 border-white flex items-center justify-center"
        >
          <span
            class="material-symbols-outlined text-[16px]"
            style="font-variation-settings: 'FILL' 1"
            >verified</span
          >
        </div>
      }
    </div>

    <!-- Name & Status -->
    <h2 class="text-headline-sm font-bold text-primary mb-xs">
      {{ userInfo()?.fullName ?? '—' }}
    </h2>

    <p class="text-body-sm text-on-surface-variant mb-md">
      @if (isVerified) {
        متطوع معتمد
      } @else if (userInfo()?.verificationStatus === VerificationStatus.Pending) {
        قيد التوثيق
      } @else {
        متطوع
      }
    </p>

    <div class="bg-surface-container px-md py-xs rounded-full inline-flex items-center gap-xs">
      <span
        class="material-symbols-outlined text-on-tertiary-container text-[18px]"
        style="font-variation-settings: 'FILL' 1"
      >
        {{ isVerified ? 'check_circle' : 'pending' }}
      </span>
      <span class="text-label-sm text-on-tertiary-container">{{ verificationLabel }}</span>
    </div>

    <!-- Contact Info -->
    <div class="w-full border-t border-outline-variant mt-lg pt-lg space-y-md text-right">
      <!-- Email -->
      @if (userInfo()?.email) {
        <div class="flex items-center gap-sm text-on-surface-variant">
          <span class="material-symbols-outlined text-secondary flex-shrink-0">mail</span>
          <span class="text-body-sm break-all">{{ userInfo()!.email }}</span>
        </div>
      }

      <!-- Address (resolved from lat/lng via Geocoding API) -->
      @if (userInfo()?.homeLatitude && userInfo()?.homeLongitude) {
        <div class="flex items-start gap-sm text-on-surface-variant">
          <span class="material-symbols-outlined text-secondary flex-shrink-0 mt-[2px]"
            >location_on</span
          >

          @if (isResolvingAddress()) {
            <!-- Skeleton loader while geocoding -->
            <div class="space-y-xs flex-1">
              <div class="h-3 bg-outline-variant rounded animate-pulse w-3/4"></div>
              <div class="h-3 bg-outline-variant rounded animate-pulse w-1/2"></div>
            </div>
          } @else {
            <span class="text-body-sm text-right leading-relaxed">
              {{ resolvedAddress() }}
            </span>
          }
        </div>
      }
    </div>

  </div>

  <!-- Activity Stats (Hidden temporarily due to missing backend data) -->

@if (false) {

<div class="glass-card rounded-xl p-md">
<h3 class="text-label-md text-on-surface-variant uppercase tracking-wider mb-md">
إحصائيات النشاط
</h3>
<div class="grid grid-cols-2 gap-sm">
<div class="bg-surface-container-low p-md rounded-lg text-center">
<span class="block text-headline-sm font-bold text-primary">12</span>
<span class="text-label-sm text-on-surface-variant">بلاغ مقدم</span>
</div>
<div class="bg-surface-container-low p-md rounded-lg text-center">
<span class="block text-headline-sm font-bold text-on-tertiary-container">4</span>
<span class="text-label-sm text-on-surface-variant">حالات تم حلها</span>
</div>
</div>
</div>
}

</aside>

**\*\*\*\***\_**\*\*\*\***SideBar.ts**\*\*\*\***\_**\*\*\*\***
import { Component, effect, inject, input, signal } from '@angular/core';
import { GeocodingService } from '../../../core/services/gecoding.service';

import { GetUserInfoDTO } from '../../../core/models/profile.model';
import { VerificationStatus } from '../../enums/verification-status';
import { environment } from '../../../../environments/environment.development';

@Component({
selector: 'app-profile-sidebar',
imports: [],
standalone: true,
templateUrl: './profile-sidebar.html',
styleUrl: './profile-sidebar.css',
})
export class ProfileSidebar {
readonly userInfo = input<GetUserInfoDTO | null>(null);

readonly VerificationStatus = VerificationStatus;

readonly #geocodingService = inject(GeocodingService);

/\*_ Human-readable Arabic address resolved from lat/lng _/
readonly resolvedAddress = signal<string | null>(null);
readonly isResolvingAddress = signal(false);

constructor() {
// Re-run whenever userInfo changes — resolves address automatically
effect(() => {
console.log('Effect fired');

      const info = this.userInfo();
      console.log(info);

      if (info?.homeLatitude && info?.homeLongitude) {
        console.log('Calling reverseGeocode');

        this.isResolvingAddress.set(true);
        this.#geocodingService.reverseGeocode(info.homeLatitude, info.homeLongitude).subscribe({
          next: (address) => {
            console.log('Address:', address);
            console.log(environment.googleMapsApiKey);

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

get avatarUrl(): string {
const img = this.userInfo()?.profileImage;
if (img) return img;
const name = this.userInfo()?.fullName ?? 'User';
return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0058be&color=fff`;
}

get isVerified(): boolean {
return this.userInfo()?.verificationStatus == VerificationStatus.Verified;

    //verificationStatus === VerificationStatus.Verified;

}

get verificationLabel(): string {
switch (this.userInfo()?.verificationStatus) {
case VerificationStatus.Verified:
return 'حساب موثق';

      case VerificationStatus.Pending:
        return 'قيد المراجعة';
      default:
        return 'غير موثق';
    }

}
}

\***\*\*\*\*\***\_\_\***\*\*\*\*\***Edit-profile-tab html**\*\***\*\***\*\***\_\_\_**\*\***\*\***\*\***

<div class="p-lg space-y-xl animate-fade-in" dir="rtl">
  
  <!-- ── Card 1: Profile & ID Images ────────────────────────────────── -->
  <div class="bg-surface border border-outline-variant rounded-2xl p-lg space-y-md shadow-sm transition-all duration-300 hover:shadow-md">
    <div class="flex justify-between items-center border-b border-outline-variant pb-sm">
      <h3 class="text-headline-sm font-bold text-primary flex items-center gap-sm">
        <span class="material-symbols-outlined text-[24px]">account_circle</span>
        الصور الشخصية والهوية
      </h3>
      <div>
        @if (!isEditingImage()) {
          <button
            type="button"
            (click)="isEditingImage.set(true)"
            class="px-md py-xs bg-secondary-container text-on-secondary-container hover:bg-secondary-container-high rounded-lg text-label-sm font-bold flex items-center gap-xs transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">edit</span>
            تعديل الصور
          </button>
        } @else {
          <div class="flex items-center gap-sm">
            <button
              type="button"
              [disabled]="isSavingImage()"
              (click)="cancelImage()"
              class="px-md py-xs text-secondary border border-secondary rounded-lg text-label-sm font-bold hover:bg-secondary-fixed transition-colors disabled:opacity-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              [disabled]="isSavingImage()"
              (click)="saveImage()"
              class="px-md py-xs text-on-primary bg-secondary rounded-lg text-label-sm font-bold hover:opacity-90 transition-all flex items-center gap-xs disabled:opacity-50 cursor-pointer"
            >
              @if (isSavingImage()) {
                <span class="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              }
              حفظ الصور
            </button>
          </div>
        }
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-lg pt-sm">
      <!-- Profile Image -->
      <div class="space-y-sm">
        <label class="text-label-md text-on-surface font-semibold">صورة الملف الشخصي</label>

        @if (profileImagePreview()) {
          <div class="relative w-24 h-24 rounded-full overflow-hidden border-2 border-secondary shadow-sm">
            <img
              [src]="profileImagePreview()!"
              alt="معاينة الصورة"
              class="w-full h-full object-cover"
            />
          </div>
        }

        @if (isEditingImage()) {
          <label
            class="flex items-center gap-sm cursor-pointer p-md bg-surface-container-low border border-dashed border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container transition-all group"
          >
            <span
              class="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform"
            >
              add_photo_alternate
            </span>
            <span class="text-label-sm text-on-surface-variant">اختر صورة</span>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              (change)="onProfileImageSelected($event)"
            />
          </label>
        }
      </div>

      <!-- ID Image -->
      <div class="space-y-sm">
        <label class="text-label-md text-on-surface font-semibold">
          صورة الهوية <span class="text-error">*</span>
        </label>

        @if (idImagePreview()) {
          <div class="relative w-full h-24 rounded-lg overflow-hidden border border-secondary shadow-sm">
            <img
              [src]="idImagePreview()!"
              alt="معاينة الهوية"
              class="w-full h-full object-cover"
            />
          </div>
        }

        @if (isEditingImage()) {
          <label
            class="flex items-center gap-sm cursor-pointer p-md bg-surface-container-low border border-dashed border-outline-variant rounded-lg hover:border-secondary hover:bg-surface-container transition-all group"
          >
            <span
              class="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform"
            >
              badge
            </span>
            <span class="text-label-sm text-on-surface-variant">اختر صورة الهوية</span>
            <input
              type="file"
              accept="image/*"
              class="hidden"
              (change)="onIdImageSelected($event)"
            />
          </label>
        }
      </div>
    </div>

  </div>

  <!-- ── Card 2: Personal Info ─────────────────────────────────────── -->
  <form [formGroup]="personalForm" (ngSubmit)="savePersonal()" class="bg-surface border border-outline-variant rounded-2xl p-lg space-y-md shadow-sm transition-all duration-300 hover:shadow-md block">
    <div class="flex justify-between items-center border-b border-outline-variant pb-sm">
      <h3 class="text-headline-sm font-bold text-primary flex items-center gap-sm">
        <span class="material-symbols-outlined text-[24px]">person</span>
        المعلومات الشخصية
      </h3>
      <div>
        @if (!isEditingPersonal()) {
          <button
            type="button"
            (click)="togglePersonalEdit(true)"
            class="px-md py-xs bg-secondary-container text-on-secondary-container hover:bg-secondary-container-high rounded-lg text-label-sm font-bold flex items-center gap-xs transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">edit</span>
            تعديل البيانات
          </button>
        } @else {
          <div class="flex items-center gap-sm">
            <button
              type="button"
              [disabled]="isSavingPersonal()"
              (click)="togglePersonalEdit(false); cancelPersonal()"
              class="px-md py-xs text-secondary border border-secondary rounded-lg text-label-sm font-bold hover:bg-secondary-fixed transition-colors disabled:opacity-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              [disabled]="personalForm.invalid || isSavingPersonal()"
              class="px-md py-xs text-on-primary bg-secondary rounded-lg text-label-sm font-bold hover:opacity-90 transition-all flex items-center gap-xs disabled:opacity-50 cursor-pointer"
            >
              @if (isSavingPersonal()) {
                <span class="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              }
              حفظ التغييرات
            </button>
          </div>
        }
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-lg pt-sm">
      <!-- First Name -->
      <div class="space-y-xs">
        <label class="text-label-md text-on-surface font-semibold"
          >الاسم الأول <span class="text-error">*</span></label
        >
        <input
          formControlName="firstName"
          type="text"
          class="w-full bg-surface-container-low border rounded-lg p-md transition-all focus:ring-2 focus:ring-secondary focus:border-secondary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          [class.border-error]="isFieldInvalid('firstName')"
          [class.border-outline-variant]="!isFieldInvalid('firstName')"
        />
        @if (isFieldInvalid('firstName')) {
          <p class="text-label-sm text-error font-medium mt-xs">
            @if (personalForm.get('firstName')?.hasError('required')) {
              الاسم الأول مطلوب
            } @else if (personalForm.get('firstName')?.hasError('maxlength')) {
              لا يتجاوز 100 حرف
            }
          </p>
        }
      </div>

      <!-- Last Name -->
      <div class="space-y-xs">
        <label class="text-label-md text-on-surface font-semibold"
          >اسم العائلة <span class="text-error">*</span></label
        >
        <input
          formControlName="lastName"
          type="text"
          class="w-full bg-surface-container-low border rounded-lg p-md transition-all focus:ring-2 focus:ring-secondary focus:border-secondary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          [class.border-error]="isFieldInvalid('lastName')"
          [class.border-outline-variant]="!isFieldInvalid('lastName')"
        />
        @if (isFieldInvalid('lastName')) {
          <p class="text-label-sm text-error font-medium mt-xs">
            @if (personalForm.get('lastName')?.hasError('required')) {
              اسم العائلة مطلوب
            } @else if (personalForm.get('lastName')?.hasError('maxlength')) {
              لا يتجاوز 100 حرف
            }
          </p>
        }
      </div>
    </div>

  </form>

  <!-- ── Card 3: Location (Google Maps) ───────────────────────────── -->
  <div class="bg-surface border border-outline-variant rounded-2xl p-lg space-y-md shadow-sm transition-all duration-300 hover:shadow-md">
    <div class="flex items-center justify-between border-b border-outline-variant pb-sm">
      <h3 class="text-headline-sm font-bold text-primary flex items-center gap-sm">
        <span class="material-symbols-outlined text-[24px]">location_on</span>
        الموقع الجغرافي
      </h3>
      <div>
        @if (!isEditingLocation()) {
          <button
            type="button"
            (click)="isEditingLocation.set(true)"
            class="px-md py-xs bg-secondary-container text-on-secondary-container hover:bg-secondary-container-high rounded-lg text-label-sm font-bold flex items-center gap-xs transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">edit</span>
            تعديل الموقع
          </button>
        } @else {
          <div class="flex items-center gap-sm">
            <button
              type="button"
              [disabled]="isSavingLocation()"
              (click)="cancelLocation()"
              class="px-md py-xs text-secondary border border-secondary rounded-lg text-label-sm font-bold hover:bg-secondary-fixed transition-colors disabled:opacity-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              [disabled]="isSavingLocation()"
              (click)="saveLocation()"
              class="px-md py-xs text-on-primary bg-secondary rounded-lg text-label-sm font-bold hover:opacity-90 transition-all flex items-center gap-xs disabled:opacity-50 cursor-pointer"
            >
              @if (isSavingLocation()) {
                <span class="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              }
              حفظ الموقع
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Use My Current Location action -->
    @if (isEditingLocation()) {
      <div class="flex justify-start gap-md animate-fade-in">
        <button
          type="button"
          (click)="useCurrentLocation()"
          class="text-label-sm text-secondary hover:underline flex items-center gap-xs font-bold cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">my_location</span>
          استخدام موقعي الحالي
        </button>
        @if (selectedLat() !== null) {
          <button
            type="button"
            (click)="resetMap()"
            class="text-label-sm text-error hover:underline flex items-center gap-xs font-bold cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">clear</span>
            إعادة تعيين
          </button>
        }
      </div>
    }

    <!-- Resolved address — read-only, populated automatically from reverse geocoding -->
    <div class="space-y-xs pt-xs">
      <label class="text-label-sm text-on-surface-variant font-semibold">العنوان</label>
      <div class="relative">
        <input
          type="text"
          readonly
          [value]="resolvedAddress() ?? ''"
          placeholder="سيتم تحديد العنوان تلقائياً بعد اختيار الموقع"
          class="w-full bg-surface-container border border-outline-variant rounded-lg p-md text-body-sm text-on-surface cursor-default select-none pr-10 focus:outline-none"
        />
        <!-- Spinner while resolving -->
        @if (isResolvingAddress()) {
          <span
            class="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-secondary animate-spin"
          >
            progress_activity
          </span>
        } @else if (resolvedAddress()) {
          <span
            class="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-tertiary-container"
            style="font-variation-settings: 'FILL' 1"
          >
            check_circle
          </span>
        }
      </div>
    </div>

    <!-- Google Maps Native Container -->
    <div
      class="relative rounded-xl overflow-hidden border border-outline-variant shadow-sm"
      style="height: 320px"
    >
      <!-- Overlay disable covering when not editing -->
      @if (!isEditingLocation()) {
        <div class="absolute inset-0 bg-black/5 z-10 cursor-not-allowed"></div>
      }

      <div #mapContainer class="w-full h-full"></div>

      <!-- Overlay hint -->
      @if (isEditingLocation()) {
        <div
          class="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-label-sm py-sm px-md text-center pointer-events-none z-20 animate-fade-in"
        >
          اسحب المؤشر أو اضغط على أي مكان في الخريطة لتحديد موقعك بدقة
        </div>
      }
    </div>

  </div>

  <!-- ── Card 4: Change Password ──────────────────────────────────── -->
  <form [formGroup]="passwordForm" (ngSubmit)="savePassword()" class="bg-surface border border-outline-variant rounded-2xl p-lg space-y-md shadow-sm transition-all duration-300 hover:shadow-md block">
    <div class="flex justify-between items-center border-b border-outline-variant pb-sm">
      <h3 class="text-headline-sm font-bold text-primary flex items-center gap-sm">
        <span class="material-symbols-outlined text-[24px]">lock</span>
        تغيير كلمة المرور
      </h3>
      <div>
        @if (!isEditingPassword()) {
          <button
            type="button"
            (click)="togglePasswordEdit(true)"
            class="px-md py-xs bg-secondary-container text-on-secondary-container hover:bg-secondary-container-high rounded-lg text-label-sm font-bold flex items-center gap-xs transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">edit</span>
            تغيير كلمة المرور
          </button>
        } @else {
          <div class="flex items-center gap-sm">
            <button
              type="button"
              [disabled]="isSavingPassword()"
              (click)="togglePasswordEdit(false); cancelPassword()"
              class="px-md py-xs text-secondary border border-secondary rounded-lg text-label-sm font-bold hover:bg-secondary-fixed transition-colors disabled:opacity-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              [disabled]="passwordForm.invalid || isSavingPassword()"
              class="px-md py-xs text-on-primary bg-secondary rounded-lg text-label-sm font-bold hover:opacity-90 transition-all flex items-center gap-xs disabled:opacity-50 cursor-pointer"
            >
              @if (isSavingPassword()) {
                <span class="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
              }
              تغيير كلمة المرور
            </button>
          </div>
        }
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-lg pt-sm">
      <!-- Current Password -->
      <div class="space-y-xs">
        <label class="text-label-md text-on-surface font-semibold"
          >كلمة المرور الحالية <span class="text-error">*</span></label
        >
        <div class="relative">
          <input
            formControlName="currentPassword"
            [type]="showPassword() ? 'text' : 'password'"
            class="w-full bg-surface-container-low border rounded-lg p-md pl-10 transition-all focus:ring-2 focus:ring-secondary focus:border-secondary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            [class.border-error]="isPasswordInvalid('currentPassword')"
            [class.border-outline-variant]="!isPasswordInvalid('currentPassword')"
          />
          <button
            type="button"
            [disabled]="!isEditingPassword()"
            (click)="showPassword.set(!showPassword())"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary disabled:opacity-50 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[20px]">
              {{ showPassword() ? 'visibility_off' : 'visibility' }}
            </span>
          </button>
        </div>
        @if (isPasswordInvalid('currentPassword')) {
          <p class="text-label-sm text-error font-medium mt-xs">كلمة المرور الحالية مطلوبة</p>
        }
      </div>

      <!-- New Password -->
      <div class="space-y-xs">
        <label class="text-label-md text-on-surface font-semibold"
          >كلمة المرور الجديدة <span class="text-error">*</span></label
        >
        <div class="relative">
          <input
            formControlName="newPassword"
            [type]="showNewPassword() ? 'text' : 'password'"
            class="w-full bg-surface-container-low border rounded-lg p-md pl-10 transition-all focus:ring-2 focus:ring-secondary focus:border-secondary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            [class.border-error]="isPasswordInvalid('newPassword') || samePasswordError || passwordMismatchError"
            [class.border-outline-variant]="!isPasswordInvalid('newPassword') && !samePasswordError && !passwordMismatchError"
          />
          <button
            type="button"
            [disabled]="!isEditingPassword()"
            (click)="showNewPassword.set(!showNewPassword())"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary disabled:opacity-50 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[20px]">
              {{ showNewPassword() ? 'visibility_off' : 'visibility' }}
            </span>
          </button>
        </div>
        @if (getPasswordError()) {
          <p class="text-label-sm text-error font-medium mt-xs">{{ getPasswordError() }}</p>
        }
        @if (samePasswordError) {
          <p class="text-label-sm text-error font-medium mt-xs">كلمة المرور الجديدة يجب أن تختلف عن الحالية</p>
        }
      </div>

      <!-- Confirm Password -->
      <div class="space-y-xs">
        <label class="text-label-md text-on-surface font-semibold"
          >تأكيد كلمة المرور الجديدة <span class="text-error">*</span></label
        >
        <div class="relative">
          <input
            formControlName="confirmPassword"
            [type]="showNewPassword() ? 'text' : 'password'"
            class="w-full bg-surface-container-low border rounded-lg p-md pl-10 transition-all focus:ring-2 focus:ring-secondary focus:border-secondary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            [class.border-error]="isPasswordInvalid('confirmPassword') || passwordMismatchError"
            [class.border-outline-variant]="!isPasswordInvalid('confirmPassword') && !passwordMismatchError"
          />
        </div>
        @if (isPasswordInvalid('confirmPassword') && passwordForm.get('confirmPassword')?.hasError('required')) {
          <p class="text-label-sm text-error font-medium mt-xs">تأكيد كلمة المرور مطلوب</p>
        }
        @if (passwordMismatchError) {
          <p class="text-label-sm text-error font-medium mt-xs font-semibold">كلمتا المرور غير متطابقتين</p>
        }
      </div>
    </div>
    <!-- Strength hint -->
    <p class="text-label-sm text-on-surface-variant mt-sm">
      8 أحرف على الأقل · حرف كبير · حرف صغير · رقم · رمز خاص
    </p>

  </form>

  <!-- ── Feedback Alerts ──────────────────────────────────────────────── -->

@if (saveError()) {

<div
      class="p-md bg-error-container text-on-error-container rounded-lg text-body-sm flex items-center gap-sm animate-fade-in"
    >
<span class="material-symbols-outlined">error</span>
{{ saveError() }}
</div>
}
@if (saveSuccess()) {
<div
      class="p-md bg-surface-container text-on-tertiary-container rounded-lg text-body-sm flex items-center gap-sm font-bold animate-fade-in"
    >
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1"
        >check_circle</span
      >
تم حفظ التغييرات بنجاح
</div>
}

</div>

\***\*\*\*\*\***\_\***\*\*\*\*\***Edit-profile.ts\***\*\*\*\*\*\*\***\_\_\_\_\***\*\*\*\*\*\*\***
import { isPlatformBrowser } from '@angular/common';
import {
AfterViewInit,
Component,
ElementRef,
inject,
input,
OnChanges,
OnDestroy,
output,
PLATFORM_ID,
signal,
SimpleChanges,
ViewChild,
effect,
} from '@angular/core';
import {
AbstractControl,
FormBuilder,
FormGroup,
ReactiveFormsModule,
ValidationErrors,
Validators,
} from '@angular/forms';
import { Subject, switchMap } from 'rxjs';
import { GetUserInfoDTO, UpdateProfileInfoDTO } from '../../../../core/models/profile.model';
import { GeocodingService } from '../../../../core/services/gecoding.service';
import { ProfileService } from '../../../../core/services/profile.service';

// ── Egypt center coordinates (default) ────────────────────────────────────
const EGYPT_LAT = 26.8206;
const EGYPT_LNG = 30.8025;
const EGYPT_ZOOM = 6;

// ── Custom validator: passwords match ─────────────────────────────────────
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
const current = group.get('currentPassword')?.value;
const next = group.get('newPassword')?.value;
if (next && current && current === next) {
return { samePassword: true };
}
return null;
}

// ── Custom validator: new password and confirm password match ─────────────
function passwordConfirmValidator(group: AbstractControl): ValidationErrors | null {
const next = group.get('newPassword')?.value;
const confirm = group.get('confirmPassword')?.value;
if (next && confirm && next !== confirm) {
return { passwordMismatch: true };
}
return null;
}

@Component({
selector: 'app-edit-profile',
standalone: true,
imports: [ReactiveFormsModule],
templateUrl: './edit-profile.html',
styleUrl: './edit-profile.css',
})
export class EditProfile implements OnChanges, AfterViewInit, OnDestroy {
readonly userInfo = input<GetUserInfoDTO | null>(null);
readonly profileUpdated = output<GetUserInfoDTO>();

readonly #fb = inject(FormBuilder);
readonly #profileService = inject(ProfileService);
readonly #geocodingService = inject(GeocodingService);
readonly #destroy$ = new Subject<void>();
readonly #platformId = inject(PLATFORM_ID);

@ViewChild('mapContainer', { static: false }) mapElement!: ElementRef<HTMLDivElement>;

// ── Section Editing Flags ─────────────────────────────────────────────────
readonly isEditingImage = signal(false);
readonly isEditingPersonal = signal(false);
readonly isEditingLocation = signal(false);
readonly isEditingPassword = signal(false);

// ── Section Loading States ────────────────────────────────────────────────
readonly isSavingImage = signal(false);
readonly isSavingPersonal = signal(false);
readonly isSavingLocation = signal(false);
readonly isSavingPassword = signal(false);

// ── Shared Feedback States ────────────────────────────────────────────────
readonly saveError = signal<string | null>(null);
readonly saveSuccess = signal(false);
readonly showPassword = signal(false);
readonly showNewPassword = signal(false);

// ── Map state ─────────────────────────────────────────────────────────────
readonly selectedLat = signal<number | null>(null);
readonly selectedLng = signal<number | null>(null);
readonly resolvedAddress = signal<string | null>(null);
readonly isResolvingAddress = signal(false);

// ── Map and Marker instances ──────────────────────────────────────────────
map: google.maps.Map | null = null;
marker: google.maps.Marker | null = null;

// ── File state ────────────────────────────────────────────────────────────
#selectedProfileImage: File | null = null;
#selectedIdImage: File | null = null;
readonly profileImagePreview = signal<string | null>(null);
readonly idImagePreview = signal<string | null>(null);

// ── Forms ──────────────────────────────────────────────────────────────────
readonly personalForm: FormGroup = this.#fb.group({
firstName: ['', [Validators.required, Validators.maxLength(100)]],
lastName: ['', [Validators.required, Validators.maxLength(100)]],
});

readonly passwordForm: FormGroup = this.#fb.group(
{
currentPassword: ['', [Validators.required]],
newPassword: [
'',
[
Validators.required,
Validators.minLength(8),
Validators.maxLength(100),
Validators.pattern(/^(?=._[a-z])(?=._[A-Z])(?=._\d)(?=._[\W_]).+$/),
],
],
confirmPassword: ['', [Validators.required]],
},
{ validators: [passwordMatchValidator, passwordConfirmValidator] }
);

constructor() {
// Dynamic effect to control marker dragability state based on edit location flag
effect(() => {
const editing = this.isEditingLocation();
if (this.marker) {
this.marker.setDraggable(editing);
}
});
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

ngOnChanges(changes: SimpleChanges): void {
if (changes['userInfo'] && this.userInfo()) {
const info = this.userInfo()!;
const nameParts = info.fullName.trim().split(' ');

      // Patch Personal Form
      this.personalForm.patchValue({
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' ') ?? '',
      });

      // Disable forms initially by default
      if (!this.isEditingPersonal()) {
        this.personalForm.disable();
      }
      if (!this.isEditingPassword()) {
        this.passwordForm.disable();
      }

      // Update image previews from userInfo if not editing
      if (!this.isEditingImage()) {
        this.profileImagePreview.set(info.profileImage);
        this.idImagePreview.set(info.identificationImage);
      }

      // Set map to user's saved location if available
      if (info.homeLatitude && info.homeLongitude) {
        this.selectedLat.set(info.homeLatitude);
        this.selectedLng.set(info.homeLongitude);
        if (this.map && isPlatformBrowser(this.#platformId)) {
          this.#updateMapAndMarker(info.homeLatitude, info.homeLongitude, 13);
        } else {
          this.#reverseGeocode(info.homeLatitude, info.homeLongitude);
        }
      }
    }

}

ngAfterViewInit(): void {
this.#initGeocodePipeline();
if (isPlatformBrowser(this.#platformId)) {
this.#initMap();
}
}

// ── Map logic ─────────────────────────────────────────────────────────────

#initMap(): void {
const lat = this.selectedLat();
const lng = this.selectedLng();

    const mapOptions: google.maps.MapOptions = {
      center: { lat: lat || EGYPT_LAT, lng: lng || EGYPT_LNG },
      zoom: lat && lng ? 13 : EGYPT_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };

    if (this.mapElement?.nativeElement) {
      this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

      if (lat && lng) {
        this.marker = new google.maps.Marker({
          position: { lat, lng },
          map: this.map,
          draggable: this.isEditingLocation(),
        });

        this.marker.addListener('dragend', () => {
          if (!this.isEditingLocation()) return;
          const pos = this.marker?.getPosition();
          if (pos) {
            const newLat = pos.lat();
            const newLng = pos.lng();
            this.selectedLat.set(newLat);
            this.selectedLng.set(newLng);
            this.#reverseGeocode(newLat, newLng);
          }
        });
      } else {
        // If user profile has no location, request current browser geolocation
        this.useCurrentLocation();
      }

      this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (!this.isEditingLocation()) return;
        const latLng = event.latLng;
        if (latLng) {
          const clickLat = latLng.lat();
          const clickLng = latLng.lng();
          this.selectedLat.set(clickLat);
          this.selectedLng.set(clickLng);
          this.#updateMapAndMarker(clickLat, clickLng);
        }
      });
    }

}

#updateMapAndMarker(lat: number, lng: number, zoom?: number): void {
if (!this.map) return;
this.map.setCenter({ lat, lng });
if (zoom !== undefined) {
this.map.setZoom(zoom);
}

    if (!this.marker) {
      this.marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        draggable: this.isEditingLocation(),
      });

      this.marker.addListener('dragend', () => {
        if (!this.isEditingLocation()) return;
        const pos = this.marker?.getPosition();
        if (pos) {
          const newLat = pos.lat();
          const newLng = pos.lng();
          this.selectedLat.set(newLat);
          this.selectedLng.set(newLng);
          this.#reverseGeocode(newLat, newLng);
        }
      });
    } else {
      this.marker.setMap(this.map);
      this.marker.setPosition({ lat, lng });
    }

    this.#reverseGeocode(lat, lng);

}

useCurrentLocation(): void {
if (isPlatformBrowser(this.#platformId) && navigator.geolocation) {
this.isResolvingAddress.set(true);
navigator.geolocation.getCurrentPosition(
(position) => {
const lat = position.coords.latitude;
const lng = position.coords.longitude;
this.selectedLat.set(lat);
this.selectedLng.set(lng);
this.#updateMapAndMarker(lat, lng, 15);
},
(error) => {
console.warn('Geolocation failed:', error);
this.isResolvingAddress.set(false);
// Fallback to Egypt if no location is selected yet
if (this.selectedLat() === null) {
this.selectedLat.set(EGYPT_LAT);
this.selectedLng.set(EGYPT_LNG);
this.#updateMapAndMarker(EGYPT_LAT, EGYPT_LNG, EGYPT_ZOOM);
}
}
);
}
}

resetMap(): void {
const info = this.userInfo();
if (info && info.homeLatitude && info.homeLongitude) {
this.selectedLat.set(info.homeLatitude);
this.selectedLng.set(info.homeLongitude);
this.#updateMapAndMarker(info.homeLatitude, info.homeLongitude, 13);
} else {
this.selectedLat.set(null);
this.selectedLng.set(null);
this.resolvedAddress.set(null);
if (this.marker) {
this.marker.setMap(null);
this.marker = null;
}
if (this.map) {
this.map.setCenter({ lat: EGYPT_LAT, lng: EGYPT_LNG });
this.map.setZoom(EGYPT_ZOOM);
}
}
}

// Subject that cancels the previous geocoding request via switchMap
// when the user picks a new location before the response arrives.
readonly #geocode$ = new Subject<{ lat: number; lng: number }>();

#initGeocodePipeline(): void {
this.#geocode$
.pipe(switchMap(({ lat, lng }) => this.#geocodingService.reverseGeocode(lat, lng)))
.subscribe({
next: (address) => {
this.resolvedAddress.set(address);
this.isResolvingAddress.set(false);
},
error: () => {
this.isResolvingAddress.set(false);
},
});
}

#reverseGeocode(lat: number, lng: number): void {
this.isResolvingAddress.set(true);
this.#geocode$.next({ lat, lng });
}

// ── File handling ─────────────────────────────────────────────────────────

onProfileImageSelected(event: Event): void {
const file = (event.target as HTMLInputElement).files?.[0];
if (!file) return;
this.#selectedProfileImage = file;
const reader = new FileReader();
reader.onload = (e) => this.profileImagePreview.set(e.target?.result as string);
reader.readAsDataURL(file);
}

onIdImageSelected(event: Event): void {
const file = (event.target as HTMLInputElement).files?.[0];
if (!file) return;
this.#selectedIdImage = file;
const reader = new FileReader();
reader.onload = (e) => this.idImagePreview.set(e.target?.result as string);
reader.readAsDataURL(file);
}

// ── Form helpers ──────────────────────────────────────────────────────────

isFieldInvalid(field: string): boolean {
const ctrl = this.personalForm.get(field);
return !!(ctrl?.invalid && ctrl?.touched);
}

isPasswordInvalid(field: string): boolean {
const ctrl = this.passwordForm.get(field);
return !!(ctrl?.invalid && ctrl?.touched);
}

getPasswordError(): string | null {
const ctrl = this.passwordForm.get('newPassword');
if (!ctrl?.touched || !ctrl?.invalid) return null;
if (ctrl.hasError('required')) return 'كلمة المرور الجديدة مطلوبة';
if (ctrl.hasError('minlength')) return 'يجب أن تكون 8 أحرف على الأقل';
if (ctrl.hasError('pattern')) return 'يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص';
return null;
}

get samePasswordError(): boolean {
return !!(this.passwordForm.hasError('samePassword') && this.passwordForm.get('newPassword')?.touched);
}

get passwordMismatchError(): boolean {
return !!(this.passwordForm.hasError('passwordMismatch') && this.passwordForm.get('confirmPassword')?.touched);
}

// ── Edit/Cancel toggles ───────────────────────────────────────────────────

togglePersonalEdit(edit: boolean): void {
this.isEditingPersonal.set(edit);
if (edit) {
this.personalForm.enable();
} else {
this.personalForm.disable();
}
}

togglePasswordEdit(edit: boolean): void {
this.isEditingPassword.set(edit);
if (edit) {
this.passwordForm.enable();
} else {
this.passwordForm.disable();
}
}

cancelPersonal(): void {
this.togglePersonalEdit(false);
this.saveError.set(null);
const info = this.userInfo();
if (info) {
const nameParts = info.fullName.trim().split(' ');
this.personalForm.patchValue({
firstName: nameParts[0] ?? '',
lastName: nameParts.slice(1).join(' ') ?? '',
});
}
}

cancelLocation(): void {
this.isEditingLocation.set(false);
this.saveError.set(null);
const info = this.userInfo();
if (info && info.homeLatitude && info.homeLongitude) {
this.selectedLat.set(info.homeLatitude);
this.selectedLng.set(info.homeLongitude);
this.#updateMapAndMarker(info.homeLatitude, info.homeLongitude, 13);
} else {
this.resetMap();
}
}

cancelImage(): void {
this.isEditingImage.set(false);
this.saveError.set(null);
const info = this.userInfo();
if (info) {
this.profileImagePreview.set(info.profileImage);
this.idImagePreview.set(info.identificationImage);
} else {
this.profileImagePreview.set(null);
this.idImagePreview.set(null);
}
this.#selectedProfileImage = null;
this.#selectedIdImage = null;
}

cancelPassword(): void {
this.togglePasswordEdit(false);
this.saveError.set(null);
this.passwordForm.reset();
}

// ── Independent Save methods ──────────────────────────────────────────────

savePersonal(): void {
if (this.personalForm.invalid || this.isSavingPersonal()) {
this.personalForm.markAllAsTouched();
return;
}

    this.isSavingPersonal.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const dto: UpdateProfileInfoDTO = {
      firstName: this.personalForm.value.firstName,
      lastName: this.personalForm.value.lastName,
      homeLatitude: this.selectedLat(),
      homeLongitude: this.selectedLng(),
      profileImage: null,
      identificationImage: null,
      currentPassword: '',
      newPassword: '',
    };

    this.#profileService.updateUserInfo(dto).subscribe({
      next: (updated) => {
        this.isSavingPersonal.set(false);
        this.togglePersonalEdit(false);
        this.saveSuccess.set(true);
        this.profileUpdated.emit(updated);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSavingPersonal.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مجدداً.';
        this.saveError.set(msg);
      },
    });

}

saveLocation(): void {
if (this.selectedLat() === null || this.selectedLng() === null || this.isSavingLocation()) {
return;
}

    this.isSavingLocation.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const info = this.userInfo();
    const nameParts = (info?.fullName || '').trim().split(' ');

    const dto: UpdateProfileInfoDTO = {
      firstName: nameParts[0] ?? '',
      lastName: nameParts.slice(1).join(' ') ?? '',
      homeLatitude: this.selectedLat(),
      homeLongitude: this.selectedLng(),
      profileImage: null,
      identificationImage: null,
      currentPassword: '',
      newPassword: '',
    };

    this.#profileService.updateUserInfo(dto).subscribe({
      next: (updated) => {
        this.isSavingLocation.set(false);
        this.isEditingLocation.set(false);
        this.saveSuccess.set(true);
        this.profileUpdated.emit(updated);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSavingLocation.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء حفظ الموقع. يرجى المحاولة مجدداً.';
        this.saveError.set(msg);
      },
    });

}

saveImage(): void {
if (this.isSavingImage()) return;

    this.isSavingImage.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const info = this.userInfo();
    const nameParts = (info?.fullName || '').trim().split(' ');

    const dto: UpdateProfileInfoDTO = {
      firstName: nameParts[0] ?? '',
      lastName: nameParts.slice(1).join(' ') ?? '',
      homeLatitude: this.selectedLat(),
      homeLongitude: this.selectedLng(),
      profileImage: this.#selectedProfileImage,
      identificationImage: this.#selectedIdImage,
      currentPassword: '',
      newPassword: '',
    };

    this.#profileService.updateUserInfo(dto).subscribe({
      next: (updated) => {
        this.isSavingImage.set(false);
        this.isEditingImage.set(false);
        this.saveSuccess.set(true);
        this.profileUpdated.emit(updated);
        this.#selectedProfileImage = null;
        this.#selectedIdImage = null;
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSavingImage.set(false);
        const msg = err?.error?.message ?? 'حدث خطأ أثناء رفع الصور. يرجى المحاولة مجدداً.';
        this.saveError.set(msg);
      },
    });

}

savePassword(): void {
if (this.passwordForm.invalid || this.isSavingPassword()) {
this.passwordForm.markAllAsTouched();
return;
}

    this.isSavingPassword.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    const info = this.userInfo();
    const nameParts = (info?.fullName || '').trim().split(' ');

    const dto: UpdateProfileInfoDTO = {
      firstName: nameParts[0] ?? '',
      lastName: nameParts.slice(1).join(' ') ?? '',
      homeLatitude: this.selectedLat(),
      homeLongitude: this.selectedLng(),
      profileImage: null,
      identificationImage: null,
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
    };

    this.#profileService.updateUserInfo(dto).subscribe({
      next: (updated) => {
        this.isSavingPassword.set(false);
        this.togglePasswordEdit(false);
        this.saveSuccess.set(true);
        this.passwordForm.reset();
        setTimeout(() => this.saveSuccess.set(false), 3000);
      },
      error: (err) => {
        this.isSavingPassword.set(false);
        const msg = err?.error?.message ?? 'كلمة المرور الحالية غير صحيحة أو حدث خطأ أثناء تغيير كلمة المرور.';
        this.saveError.set(msg);
      },
    });

}

ngOnDestroy(): void {
this.#destroy$.next();
    this.#destroy$.complete();
this.#geocode$.complete();
if (this.marker) {
google.maps.event.clearInstanceListeners(this.marker);
this.marker.setMap(null);
this.marker = null;
}
if (this.map) {
google.maps.event.clearInstanceListeners(this.map);
this.map = null;
}
}
}

**\*\***\*\***\*\***\_\_**\*\***\*\***\*\***view_profile html \***\*\*\*\*\*\*\***\_\***\*\*\*\*\*\*\***

<div class="bg-background text-on-background min-h-screen flex flex-col">
  <main class="flex-1 max-w-max-width mx-auto w-full px-margin-mobile md:px-margin-desktop py-lg">
    <!-- Loading State -->
    @if (isLoading()) {
      <div class="flex justify-center items-center py-xl">
        <span class="material-symbols-outlined text-secondary text-[48px] animate-spin"> </span>
      </div>
    }

    <!-- Error State -->
    @else if (loadError()) {
      <div class="p-md bg-error-container text-on-error-container rounded-xl text-center">
        <p class="text-body-sm font-bold">{{ loadError() }}</p>
        <button
          (click)="ngOnInit()"
          class="mt-md px-lg py-sm bg-error text-white rounded-lg text-label-sm hover:opacity-90"
        >
          إعادة المحاولة
        </button>
      </div>
    }

    <!-- Main Content -->
    @else {
      <div class="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <!-- Sidebar -->
        <app-profile-sidebar class="md:col-span-3" [userInfo]="userInfo()" />

        <!-- Main Content Area -->
        <div class="md:col-span-9">
          <!-- Tabs Navigation -->
          <div class="bg-surface-container-lowest rounded-xl shadow-sm mb-gutter overflow-hidden">
            <div class="flex border-b border-outline-variant">
              @for (tab of tabs; track tab.id) {
                <button
                  (click)="switchTab(tab.id)"
                  class="flex-1 py-md px-lg text-label-md font-label-md border-b-2 transition-all hover:bg-surface-container-lowest relative"
                  [class.border-secondary]="activeTab() === tab.id"
                  [class.text-secondary]="activeTab() === tab.id"
                  [class.bg-surface-container-low]="activeTab() === tab.id"
                  [class.border-transparent]="activeTab() !== tab.id"
                  [class.text-on-surface-variant]="activeTab() !== tab.id"
                >
                  {{ tab.label }}
                  <!-- Notification badge on Notifications tab -->
                  @if (tab.id === 'notifications' && notificationUnreadCount() > 0) {
                    <span
                      class="absolute top-2 left-1/2 -translate-x-1/2 translate-x-6 bg-error text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-[3px]"
                    >
                      {{ notificationUnreadCount() > 99 ? '99+' : notificationUnreadCount() }}
                    </span>
                  }
                </button>
              }
            </div>

            <!-- Tab Content -->
            @switch (activeTab()) {
              @case ('edit') {
                <app-edit-profile
                  [userInfo]="userInfo()"
                  (profileUpdated)="onProfileUpdated($event)"
                />
              }
              @case ('reports') {
                <app-reports-tab />
              }
              @case ('chat') {
                <app-chat-tab />
              }
              @case ('notifications') {
                <app-notifications-tab />
              }
            }
          </div>
        </div>
      </div>
    }

  </main>
</div>
____________________________profile view ts ________________________________
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

**\*\***\*\***\*\***\_**\*\***\*\***\*\***profile DTOS\***\*\*\*\*\***\_\_\***\*\*\*\*\***
import { VerificationStatus } from '../../shared/enums/verification-status';

export interface GetUserInfoDTO {
fullName: string;
email: string;
emailConfirmed: boolean;
homeLatitude: number | null;
homeLongitude: number | null;
profileImage: string | null;
verificationStatus: VerificationStatus;
identificationImage: string | null;
}

export interface UpdateProfileInfoDTO {
firstName: string;
lastName: string;
homeLatitude: number | null;
homeLongitude: number | null;
identificationImage?: File | null;
profileImage?: File | null;
currentPassword: string;
newPassword: string;
}

**\*\***\_\_\_\_**\*\***geo location service \***\*\*\*\*\*\*\***\_\_\***\*\*\*\*\*\*\***
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment.development';

interface GeocodeResult {
formatted_address: string;
address_components: {
long_name: string;
short_name: string;
types: string[];
}[];
}

interface GeocodeResponse {
status: string;
results: GeocodeResult[];
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
readonly #http = inject(HttpClient);

/\*\*

- Reverse geocode: converts lat/lng coordinates to a human-readable address.
- Returns Arabic address string, falls back to coordinate string on error.
  \*/
  reverseGeocode(lat: number, lng: number): Observable<string> {
  const url =
  `https://maps.googleapis.com/maps/api/geocode/json` +
  `?latlng=${lat},${lng}` +
  `&language=ar` + // Arabic results
  `&result_type=locality|administrative_area_level_1|country` +
  `&key=${environment.googleMapsApiKey}`;

  return this.#http.get<GeocodeResponse>(url).pipe(
  map((response) => {
  if (response.status === 'OK' && response.results.length > 0) {
  // Use the first result's formatted address (already in Arabic)
  return response.results[0].formatted_address;
  }
  // Fallback: raw coordinates
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }),
  catchError(() => {
  // Never let geocoding break the UI
  return of(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  }),
  );

}

/\*\*

- Forward geocode: converts an address string to lat/lng.
- Useful for future search-by-address feature.
  \*/
  forwardGeocode(address: string): Observable<{ lat: number; lng: number } | null> {
  const url =
  `https://maps.googleapis.com/maps/api/geocode/json` +
  `?address=${encodeURIComponent(address)}` +
  `&language=ar` +
  `&key=${environment.googleMapsApiKey}`;

  return this.#http.get<GeocodeResponse>(url).pipe(
  map((response) => {
  if (response.status === 'OK' && response.results.length > 0) {
  const loc = response.results[0];
  // Extract from geometry — typed access
  const geometry = (
  loc as GeocodeResult & {
  geometry: { location: { lat: number; lng: number } };
  }
  ).geometry;
  return { lat: geometry.location.lat, lng: geometry.location.lng };
  }
  return null;
  }),
  catchError(() => of(null)),
  );

}
}
**\*\*\*\***\_\_**\*\*\*\***profile service \***\*\*\*\*\*\*\***\_\_\_\***\*\*\*\*\*\*\***
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { GetUserInfoDTO, UpdateProfileInfoDTO } from '../models/profile.model';
export interface ApiResponse<T> {
success: boolean;
message: string;
data: T;
}
@Injectable({ providedIn: 'root' })
export class ProfileService {
readonly #http = inject(HttpClient);
readonly #baseUrl = `${environment.apiBaseUrl}/UserProfile`;

getUserInfo(): Observable<ApiResponse<GetUserInfoDTO>> {
return this.#http.get<ApiResponse<GetUserInfoDTO>>(`${this.#baseUrl}/GetInfo`);
// return this.#http.get<GetUserInfoDTO>(`${this.#baseUrl}/GetInfo`);
}

updateUserInfo(dto: UpdateProfileInfoDTO): Observable<GetUserInfoDTO> {
const formData = new FormData();
formData.append('firstName', dto.firstName);
formData.append('lastName', dto.lastName);
formData.append('currentPassword', dto.currentPassword);
formData.append('newPassword', dto.newPassword);

    if (dto.homeLatitude !== null && dto.homeLatitude !== undefined) {
      formData.append('homeLatitude', dto.homeLatitude.toString());
    }
    if (dto.homeLongitude !== null && dto.homeLongitude !== undefined) {
      formData.append('homeLongitude', dto.homeLongitude.toString());
    }
    if (dto.profileImage) {
      formData.append('profileImage', dto.profileImage);
    }
    if (dto.identificationImage) {
      formData.append('identificationImage', dto.identificationImage);
    }

    return this.#http.put<GetUserInfoDTO>(`${this.#baseUrl}/UpdateInfo`, formData);

}
}

\***\*\*\*\*\*\*\***\_\_\_\***\*\*\*\*\*\*\***Back End -endpoint &service **\*\*\*\***\_\_\_\_**\*\*\*\***

[HttpGet("GetInfo")]
[HasPermission(Permissions.Profile.GetUserInfo)]
public async Task<IActionResult> GetUserInfo()
{
var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
var profile = await \_user.GetProfileInfoAsync(userId);
return Ok(profile);
}

[HttpPut("UpdateInfo")]
[HasPermission(Permissions.Profile.UpdateUserInfo)]
public async Task<IActionResult> UpdateUserInfo([FromForm] UpdateProfileInfoDTO dTO)
{
var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
var UpdateProfile = await \_user.UpdateProfileInfoAsync(userId, dTO);
if (UpdateProfile == null)
return NotFound();
return Ok(UpdateProfile);
}

public async Task<ApiResponse<bool>> UpdateProfileInfoAsync(string userId, UpdateProfileInfoDTO dto)
{
\_logger.LogInformation("Update User Info with Id: {UserId} at {Time}", userId, DateTime.UtcNow);
var user = await \_userManager.FindByIdAsync(userId);
if (user == null)
{
\_logger.LogWarning("User With Id :{UserId} Not Found at {Time}", userId, DateTime.UtcNow);
throw new NotFoundException("المستخدم غير موجود.");
}

     _mapper.Map(dto, user);
     if (!string.IsNullOrWhiteSpace(dto.NewPassword))
     {
         var changePasswordResult = await _userManager.ChangePasswordAsync(
             user,
             dto.CurrentPassword!,
             dto.NewPassword);

         if (!changePasswordResult.Succeeded)
         {
             _logger.LogWarning(
                 "Failed to change password for UserId: {UserId}. Errors: {Errors}",
                 userId,
                 string.Join(", ", changePasswordResult.Errors.Select(e => e.Description)));

             throw new BadRequestException(
                 string.Join(", ", changePasswordResult.Errors.Select(e => e.Description)));
         }
     }
