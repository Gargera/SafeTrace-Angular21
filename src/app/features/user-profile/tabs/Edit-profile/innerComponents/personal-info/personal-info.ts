import { Component, inject, input, OnChanges, OnInit, output, signal, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SnackbarService } from '../../../../../../shared/services/toast.service';
import { GetUserInfoDTO, UpdateNameDTO } from '../../../../model/profile.model';
import { ProfileService } from '../../../../service/profile.service';
import { ButtonComponent } from '../../../../../../shared/components/button/button';
import { FormField } from '../../../../../../shared/components/form-field/form-field';
import { extractErrorMessage } from '../../../../../../shared/helper/error.helper';
import { CacheService } from '../../../../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../../../../core/cache/cache.constants';

@Component({
  selector: 'app-personal-info',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, FormField],
  templateUrl: './personal-info.html',
})
export class PersonalInfo implements OnChanges, OnInit {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  // Emitted after a successful save — parent re-fetches GetUserInfo and
  // pushes the fresh profile up to ProfileView (UpdateName only returns
  // a bool, not the updated user).
  readonly personalUpdated = output<void>();

  readonly #fb = inject(FormBuilder);
  readonly #profileService = inject(ProfileService);
  readonly #snackbar = inject(SnackbarService);
  readonly #cacheService = inject(CacheService);

  readonly isEditingPersonal = signal(false);
  readonly isSavingPersonal = signal(false);

  readonly personalForm: FormGroup = this.#fb.group({
    firstName: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(/^[\u0600-\u06FF]+(\s+)?$/),
      ],
    ],

    lastName: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(/^[\u0600-\u06FF]+(\s[\u0600-\u06FF]+)*(\s+)?$/),
      ],
    ],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userInfo'] && this.userInfo()) {
      const info = this.userInfo()!;
      const nameParts = info.fullName.trim().split(' ');

      // Patch Personal Form
      this.personalForm.patchValue({
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' ') ?? '',
      });

      // Disable form initially by default
      if (!this.isEditingPersonal()) {
        this.personalForm.disable();
      }
    }
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const ctrl = this.personalForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  ngOnInit(): void {
    const cached = this.#cacheService.get<{ firstName: string; lastName: string; isEditing: boolean }>('Profile_PersonalInfo_Draft');
    if (cached) {
      if (cached.isEditing) {
        this.togglePersonalEdit(true);
        this.personalForm.patchValue({ firstName: cached.firstName, lastName: cached.lastName });
      }
    }

    this.personalForm.valueChanges.subscribe((val) => {
      if (this.isEditingPersonal()) {
        this.#cacheService.set('Profile_PersonalInfo_Draft', { ...val, isEditing: true }, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);
      }
    });
  }

  // ── Edit/Cancel toggle ───────────────────────────────────────────────────

  togglePersonalEdit(edit: boolean): void {
    this.isEditingPersonal.set(edit);
    if (edit) {
      this.personalForm.enable();
    } else {
      this.personalForm.disable();
    }
  }

  cancelPersonal(): void {
    this.#cacheService.remove('Profile_PersonalInfo_Draft');
    this.togglePersonalEdit(false);
    const info = this.userInfo();
    if (info) {
      const nameParts = info.fullName.trim().split(' ');
      this.personalForm.patchValue({
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' ') ?? '',
      });
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  savePersonal(): void {
    if (this.personalForm.invalid || this.isSavingPersonal()) {
      this.personalForm.markAllAsTouched();
      return;
    }

    this.isSavingPersonal.set(true);

    const dto: UpdateNameDTO = {
      firstName: this.personalForm.value.firstName.trim(),
      lastName: this.personalForm.value.lastName.trim(),
    };

    this.#profileService.updateName(dto).subscribe({
      next: () => {
        this.#cacheService.remove('Profile_PersonalInfo_Draft');
        this.isSavingPersonal.set(false);
        this.togglePersonalEdit(false);
        this.#snackbar.success('تم حفظ التغييرات بنجاح');
        this.personalUpdated.emit();
      },
      error: (err) => {
        this.isSavingPersonal.set(false);
        const msg =
          err?.error?.message ||
          extractErrorMessage(err, 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مجدداً.');
        this.#snackbar.error(msg);
      },
    });
  }
}
