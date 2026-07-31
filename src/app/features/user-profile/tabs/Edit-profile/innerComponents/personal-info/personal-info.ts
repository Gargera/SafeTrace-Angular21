import { Component, inject, input, OnChanges, output, signal, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SnackbarService } from '../../../../../../core/services/toast.service';
import { GetUserInfoDTO, UpdateNameDTO } from '../../../../model/profile.model';
import { ProfileService } from '../../../../service/profile.service';

@Component({
  selector: 'app-personal-info',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './personal-info.html',
})
export class PersonalInfo implements OnChanges {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  // Emitted after a successful save — parent re-fetches GetUserInfo and
  // pushes the fresh profile up to ProfileView (UpdateName only returns
  // a bool, not the updated user).
  readonly personalUpdated = output<void>();

  readonly #fb = inject(FormBuilder);
  readonly #profileService = inject(ProfileService);
  readonly #snackbar = inject(SnackbarService);

  readonly isEditingPersonal = signal(false);
  readonly isSavingPersonal = signal(false);

  readonly personalForm: FormGroup = this.#fb.group({
    firstName: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern('^[a-zA-Z\u0600-\u06FF]+$'),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern('^[a-zA-Z\u0600-\u06FF]+( [a-zA-Z\u0600-\u06FF]+)*$'),
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
        this.isSavingPersonal.set(false);
        this.togglePersonalEdit(false);
        this.#snackbar.success('تم حفظ التغييرات بنجاح');
        this.personalUpdated.emit();
      },
      error: (err) => {
        this.isSavingPersonal.set(false);
        const msg = err?.error?.message || err.error?.detail || 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مجدداً.';
        this.#snackbar.error(msg);
      },
    });
  }
}
