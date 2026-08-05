import {
  Component,
  inject,
  input,
  OnChanges,
  OnDestroy,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SnackbarService } from '../../../../../../shared/services/toast.service';
import { GetUserInfoDTO } from '../../../../model/profile.model';
import { ProfileService } from '../../../../service/profile.service';
import { FormField } from '../../../../../../shared/components/form-field/form-field';
import { ButtonComponent } from '../../../../../../shared/components/button/button';

@Component({
  selector: 'app-phone',
  standalone: true,
  imports: [ReactiveFormsModule, FormField, ButtonComponent],
  templateUrl: './phone.html',
})
export class Phone implements OnChanges, OnDestroy {
  readonly userInfo = input<GetUserInfoDTO | null>(null);
  // Emitted after a successful save — parent re-fetches GetUserInfo and
  // pushes the fresh profile up to ProfileView (UpdatePhoneNumber only
  // returns a bool, not the updated user).
  readonly phoneUpdated = output<void>();

  readonly #fb = inject(FormBuilder);
  readonly #profileService = inject(ProfileService);
  readonly #snackbar = inject(SnackbarService);
  readonly #destroy$ = new Subject<void>();

  readonly isEditingPhone = signal(false);
  readonly isSavingPhone = signal(false);

  readonly phoneForm: FormGroup = this.#fb.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userInfo'] && this.userInfo()) {
      const info = this.userInfo()!;

      this.phoneForm.patchValue({
        phoneNumber: info.phoneNumber ?? '',
      });

      // Disable form initially by default
      if (!this.isEditingPhone()) {
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
          this.phoneUpdated.emit();
        },
        error: (err) => {
          this.isSavingPhone.set(false);
          const msg = err?.error?.message || err.error?.detail || 'حدث خطأ اثناء تغيير رقم الهاتف';
          this.#snackbar.error(msg);
        },
      });
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
    this.#destroy$.complete();
  }
}
