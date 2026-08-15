import {
  Component,
  inject,
  input,
  OnChanges,
  OnDestroy,
  output,
  signal,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SnackbarService } from '../../../../../../shared/services/toast.service';
import { GetUserInfoDTO } from '../../../../model/profile.model';
import { ProfileService } from '../../../../service/profile.service';
import { FormField } from '../../../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../../../shared/components/button/button';
import { egyptianPhone } from '../../../../../../shared/validators/egyptian-phone.validator';
import { extractErrorMessage } from '../../../../../../shared/helper/error.helper';
import { CacheService } from '../../../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL, PROFILE_CACHE_KEYS } from '../../../../../../core/cache/cache.constants';

const DRAFT_CACHE_KEY = PROFILE_CACHE_KEYS.DRAFT_PHONE;

@Component({
  selector: 'app-phone',
  standalone: true,
  imports: [ReactiveFormsModule, FormField, ButtonComponent],
  templateUrl: './phone.html',
})
export class Phone implements OnChanges, OnDestroy, OnInit {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  // Emitted after a successful save — parent re-fetches GetUserInfo and
  // pushes the fresh profile up to ProfileView (UpdatePhoneNumber only
  // returns a bool, not the updated user).
  readonly phoneUpdated = output<void>();

  readonly #fb = inject(FormBuilder);
  readonly #profileService = inject(ProfileService);
  readonly #snackbar = inject(SnackbarService);
  readonly #cacheService = inject(CacheService);
  readonly #destroy$ = new Subject<void>();

  readonly isEditingPhone = signal(false);
  readonly isSavingPhone = signal(false);

  readonly phoneForm: FormGroup = this.#fb.group({
    phoneNumber: ['', [Validators.required, egyptianPhone()]],
  });

  ngOnInit(): void {
    const draft = this.#cacheService.get<any>(DRAFT_CACHE_KEY);
    if (draft) {
      this.isEditingPhone.set(true);
      this.phoneForm.enable();
      this.phoneForm.patchValue(draft);
      this.phoneForm.markAsDirty();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userInfo'] && this.userInfo()) {
      const info = this.userInfo()!;

      if (!this.isEditingPhone()) {
        this.phoneForm.patchValue({
          phoneNumber: info.phoneNumber ?? '',
        });
        this.phoneForm.disable();
      }
    }
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  isPhoneFieldInvalid(field: string): boolean {
    const ctrl = this.phoneForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  // ── Edit/Cancel toggle ───────────────────────────────────────────────────

  togglePhoneEdit(edit: boolean): void {
    this.isEditingPhone.set(edit);
    if (edit) {
      this.phoneForm.enable();
    } else {
      this.phoneForm.disable();
    }
  }

  cancelPhone(): void {
    this.phoneForm.patchValue({
      phoneNumber: this.userInfo()?.phoneNumber ?? '',
    });
    this.phoneForm.markAsPristine();
    this.#cacheService.remove(DRAFT_CACHE_KEY);
  }

  /**
   * Phone number save — dedicated endpoint, same independent-section
   * pattern as savePersonal/saveLocation/savePassword. Relies on the
   * phoneUpdated output so the parent can pull the fresh GetUserInfoDTO
   * from the server (UpdatePhoneNumber only returns a bool, not the
   * updated user).
   */
  savePhoneNumber(): void {
    if (this.phoneForm.invalid || this.isSavingPhone()) {
      this.phoneForm.markAllAsTouched();
      return;
    }

    this.isSavingPhone.set(true);

    const phoneNumber = this.phoneForm.value.phoneNumber as string;

    this.#profileService
      .updatePhoneNumber(phoneNumber)
      .pipe(takeUntil(this.#destroy$))
      .subscribe({
        next: () => {
          this.isSavingPhone.set(false);
          this.togglePhoneEdit(false);
          this.#snackbar.success('تم تغيير رقم الهاتف بنجاح');
          this.#cacheService.remove(DRAFT_CACHE_KEY);
          this.phoneUpdated.emit();
        },
        error: (err) => {
          this.isSavingPhone.set(false);
          const msg = err?.error?.message || extractErrorMessage(err, 'حدث خطأ اثناء تغيير رقم الهاتف');
          this.#snackbar.error(msg);
        },
      });
  }

  ngOnDestroy(): void {
    if (this.isEditingPhone() && this.phoneForm.dirty) {
      this.#cacheService.set(DRAFT_CACHE_KEY, this.phoneForm.value, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);
    }
    this.#destroy$.next();
    this.#destroy$.complete();
  }
}
