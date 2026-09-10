import {
  Component,
  input,
  output,
  inject,
  signal,
  DestroyRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { ImageService } from '../../../services/image.service';
import { maxFilesCount } from '../../../validators/image-validation.validator';
import { getControlFieldError } from '../../../helper/form-validation.helper';
import { CaseFileResponse } from '../../../../core/models/cases.model';
import { validateVideoFile } from '../../../validators/video-validation.validator';
import { CaseObjectUrlRegistry } from '../../../helper/cases-helper/case-form.helper';
import { ButtonComponent } from '../../button/button';

export interface CaseMediaPayload {
  primaryImage: File | null;
  additionalImages: File[];
  video: File | null;
  deletedImageIds: number[];
  isExistingVideoDeleted?: boolean;
  primaryPhotoId: number | null;
  originalPrimaryImage?: File | null;
}

@Component({
  selector: 'app-case-media-uploader',
  standalone: true,
  imports: [CommonModule, ImageCropperComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './case-media-uploader.html',
})
export class CaseMediaUploaderComponent implements OnInit, OnChanges {
  mode = input<'create' | 'update'>('create');

  // Existing Data (for Update mode)
  existingPhotos = input<CaseFileResponse[]>([]);
  existingVideoUrl = input<string | null>(null);

  // Initial State (for Cache restoration in Create mode, or initial state in Update mode)
  initialPrimaryFile = input<File | null>(null);
  initialOriginalPrimaryFile = input<File | null>(null);
  initialPrimaryPhotoId = input<number | null>(null);
  initialAdditionalFiles = input<File[]>([]);
  initialVideoFile = input<File | null>(null);
  initialDeletedPhotoIds = input<number[]>([]);
  initialExistingVideoDeleted = input(false);

  // Errors from Parent
  errors = input<{
    primary?: string | null;
    additional?: string | null;
    video?: string | null;
  }>({});

  mediaChange = output<CaseMediaPayload>();
  clearError = output<'primary' | 'additional' | 'video'>();

  private imageService = inject(ImageService);
  private destroyRef = inject(DestroyRef);
  private readonly objectUrls = new CaseObjectUrlRegistry();

  // Internal State
  localExistingPhotos = signal<CaseFileResponse[]>([]);
  deletedPhotoIds = signal<number[]>([]);
  primaryPhotoId = signal<number | null>(null);

  newPrimaryImage = signal<File | null>(null);
  newPrimaryPreview = signal<string | null>(null);
  private originalPrimaryImage = signal<File | null>(null);
  private primaryImageSource = signal<File | null>(null);
  private pendingCropSource = signal<File | null>(null);

  // Active Cropper State
  cropImageEvent = signal<Event | null>(null);
  tempCroppedBlob = signal<Blob | null>(null);

  newPhotos = signal<File[]>([]);
  newPhotoPreviews = signal<string[]>([]);

  existingPrimaryPhoto = computed(() => {
    const id = this.primaryPhotoId();
    return this.localExistingPhotos().find((p) => p.id === id) || null;
  });

  existingAdditionalPhotos = computed(() => {
    const id = this.primaryPhotoId();
    return this.localExistingPhotos().filter((p) => p.id !== id);
  });

  videoFile = signal<File | null>(null);
  videoPreview = signal<string | null>(null);
  isVideoModalOpen = signal(false);
  isExistingVideoDeleted = signal(false);

  // Local UI errors (for frontend validation before submit)
  localPrimaryError = signal<string | null>(null);
  localAdditionalError = signal<string | null>(null);
  localVideoError = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.objectUrls.revokeAll());
  }

  ngOnInit(): void {
    if (this.mode() === 'update') {
      this.syncExistingPhotoState();
      this.isExistingVideoDeleted.set(this.initialExistingVideoDeleted());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.mode() === 'update' &&
      (changes['existingPhotos'] ||
        changes['initialDeletedPhotoIds'] ||
        changes['initialPrimaryPhotoId'])
    ) {
      this.syncExistingPhotoState();
    }

    if (changes['initialExistingVideoDeleted']) {
      this.isExistingVideoDeleted.set(
        this.mode() === 'update' && !!changes['initialExistingVideoDeleted'].currentValue
      );
    }

    if (changes['initialPrimaryFile'] && changes['initialPrimaryFile'].currentValue !== undefined) {
      const file = changes['initialPrimaryFile'].currentValue;
      this.newPrimaryImage.set(file);
      if (file) {
        this.primaryImageSource.set(file);
        this.newPrimaryPreview.set(this.objectUrls.replace('primary', file));
        this.localPrimaryError.set(null);
      } else {
        this.primaryImageSource.set(null);
        this.newPrimaryPreview.set(null);
      }
    }

    if (changes['initialOriginalPrimaryFile'] && changes['initialOriginalPrimaryFile'].currentValue !== undefined) {
      this.originalPrimaryImage.set(changes['initialOriginalPrimaryFile'].currentValue || null);
    }

    if (changes['initialAdditionalFiles'] && changes['initialAdditionalFiles'].currentValue !== undefined) {
      const files = changes['initialAdditionalFiles'].currentValue;
      this.newPhotos.set(files || []);
      if (files && files.length > 0) {
        this.newPhotoPreviews.set(this.objectUrls.replaceMany('additional', files) || []);
        this.localAdditionalError.set(null);
      } else {
        this.newPhotoPreviews.set([]);
      }
    }

    if (changes['initialVideoFile'] && changes['initialVideoFile'].currentValue !== undefined) {
      const file = changes['initialVideoFile'].currentValue || null;
      if (file !== this.videoFile()) {
        this.videoFile.set(file);
        if (file) {
          this.videoPreview.set(this.objectUrls.replace('video', file));
          this.isExistingVideoDeleted.set(false);
        } else {
          this.videoPreview.set(null);
          this.objectUrls.revoke('video');
        }
        this.localVideoError.set(null);
      }
    }
  }

  private emitChange(): void {
    const payload: CaseMediaPayload = {
      primaryImage: this.newPrimaryImage(),
      additionalImages: this.newPhotos(),
      video: this.videoFile(),
      deletedImageIds: this.deletedPhotoIds(),
      primaryPhotoId: this.primaryPhotoId(),
      originalPrimaryImage: this.originalPrimaryImage()
    };
    if (this.mode() === 'update') {
      payload.isExistingVideoDeleted = this.isExistingVideoDeleted();
    }
    this.mediaChange.emit(payload);
  }

  private clearFieldError(field: 'primary' | 'additional' | 'video'): void {
    this.clearError.emit(field);
  }

  private syncExistingPhotoState(): void {
    const deletedIds = [...new Set(this.initialDeletedPhotoIds())];
    const remainingPhotos = this.existingPhotos().filter((photo) => !deletedIds.includes(photo.id));
    const initialPrimaryId = this.initialPrimaryPhotoId();

    this.deletedPhotoIds.set(deletedIds);
    this.localExistingPhotos.set(remainingPhotos);
    this.primaryPhotoId.set(
      initialPrimaryId !== null && remainingPhotos.some((photo) => photo.id === initialPrimaryId)
        ? initialPrimaryId
        : null
    );
  }

  public validate(): boolean {
    if (this.cropImageEvent()) {
      if (this.tempCroppedBlob()) {
        this.confirmCrop();
      } else {
        this.localPrimaryError.set('برجاء اعتماد الصورة (تأكيد القص) قبل الإرسال.');
        return false;
      }
    }

    let isValid = true;

    const hasExistingPrimary =
      this.mode() === 'update' &&
      this.primaryPhotoId() !== null &&
      this.localExistingPhotos().some((photo) => photo.id === this.primaryPhotoId());
    const hasPrimary = this.mode() === 'create'
      ? !!this.newPrimaryImage()
      : !!this.newPrimaryImage() || hasExistingPrimary;
    if (!hasPrimary) {
      this.localPrimaryError.set('الصورة الأساسية مطلوبة.');
      isValid = false;
    } else {
      this.localPrimaryError.set(null);
    }

    const additionalImagesControl = new FormControl([...this.newPhotos(), ...this.existingAdditionalPhotos()], [maxFilesCount(4)]);
    additionalImagesControl.markAsTouched();
    if (additionalImagesControl.invalid) {
      this.localAdditionalError.set(getControlFieldError(additionalImagesControl));
      isValid = false;
    } else {
      this.localAdditionalError.set(null);
    }

    if (this.localAdditionalError() || this.localVideoError()) {
      isValid = false;
    }

    return isValid;
  }

  // -------------------------------------------------------------
  // Existing Photos (Update Mode)
  // -------------------------------------------------------------

  removeExistingPhoto(photo: CaseFileResponse): void {
    this.localExistingPhotos.update((list) => list.filter((p) => p.id !== photo.id));
    this.deletedPhotoIds.update((ids) => ids.includes(photo.id) ? ids : [...ids, photo.id]);

    if (this.primaryPhotoId() === photo.id) {
      this.primaryPhotoId.set(null);
    }
    this.emitChange();
  }



  // -------------------------------------------------------------
  // Primary Photo
  // -------------------------------------------------------------

  onPrimaryPhotoSelected(event: Event): void {
    this.clearFieldError('primary');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validation = this.imageService.validate(file, 5);
    if (!validation.valid) {
      this.localPrimaryError.set(validation.errorMessage ?? null);
      input.value = '';
      return;
    }

    this.localPrimaryError.set(null);
    this.originalPrimaryImage.set(file);
    this.pendingCropSource.set(file);
    this.tempCroppedBlob.set(null);
    this.cropImageEvent.set(event);
  }

  onImageCropped(event: ImageCroppedEvent): void {
    if (event.blob) {
      this.tempCroppedBlob.set(event.blob);
    }
  }

  confirmCrop(): void {
    const blob = this.tempCroppedBlob();
    if (!blob) return;

    const croppedFile = new File([blob], `primary_image_${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });

    this.newPrimaryImage.set(croppedFile);
    this.newPrimaryPreview.set(this.objectUrls.replace('primary', croppedFile));
    this.primaryImageSource.set(this.originalPrimaryImage() ?? this.pendingCropSource() ?? croppedFile);

    this.cropImageEvent.set(null);
    this.pendingCropSource.set(null);
    this.emitChange();
  }

  cancelCrop(): void {
    this.cropImageEvent.set(null);
    this.pendingCropSource.set(null);
    this.tempCroppedBlob.set(null);
  }

  reCropPrimary(): void {
    const source = this.originalPrimaryImage() ?? this.primaryImageSource() ?? this.newPrimaryImage();
    if (!source) return;
    this.pendingCropSource.set(source);
    this.tempCroppedBlob.set(null);

    const dt = new DataTransfer();
    dt.items.add(source);
    this.cropImageEvent.set({ target: { files: dt.files } } as unknown as Event);
  }

  clearPrimary(): void {
    this.newPrimaryImage.set(null);
    this.originalPrimaryImage.set(null);
    this.newPrimaryPreview.set(null);
    this.primaryImageSource.set(null);
    this.objectUrls.revoke('primary');
    this.localPrimaryError.set(null);
    this.emitChange();
  }

  // -------------------------------------------------------------
  // Additional Photos
  // -------------------------------------------------------------

  onAdditionalPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    let files = Array.from(input.files ?? []);

    if (files.length === 0) {
      input.value = '';
      return;
    }

    this.clearFieldError('additional');

    for (const f of files) {
      const validation = this.imageService.validate(f, 5);
      if (!validation.valid) {
        this.localAdditionalError.set(validation.errorMessage ?? null);
        input.value = '';
        return;
      }
    }

    const proposedPhotos = [...this.newPhotos(), ...files, ...this.existingAdditionalPhotos()];
    const additionalImagesControl = new FormControl(proposedPhotos, [maxFilesCount(4)]);
    additionalImagesControl.markAsTouched();
    if (additionalImagesControl.invalid) {
      this.localAdditionalError.set(getControlFieldError(additionalImagesControl));
      input.value = '';
      return;
    }

    this.localAdditionalError.set(null);
    this.newPhotos.update((p) => [...p, ...files]);
    this.newPhotoPreviews.set(this.objectUrls.replaceMany('additional', this.newPhotos()) || []);
    input.value = '';
    this.emitChange();
  }

  removeNewPhoto(index: number): void {
    const updated = this.newPhotos().filter((_, i) => i !== index);
    this.newPhotos.set(updated);
    this.newPhotoPreviews.set(this.objectUrls.replaceMany('additional', updated) || []);
    this.localAdditionalError.set(null);
    this.emitChange();
  }

  // -------------------------------------------------------------
  // Video
  // -------------------------------------------------------------

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    this.clearFieldError('video');

    const validation = validateVideoFile(file, 50);

    if (!validation.valid) {
      this.videoFile.set(null);
      this.localVideoError.set(validation.errorMessage ?? 'الفيديو غير صالح.');
      input.value = '';
      this.emitChange();
      return;
    }

    this.localVideoError.set(null);
    this.videoFile.set(file);
    this.videoPreview.set(this.objectUrls.replace('video', file));
    this.isExistingVideoDeleted.set(false);
    this.emitChange();
  }

  removeVideo(): void {
    const isCancellingNewUpload = this.videoFile() !== null;
    this.videoFile.set(null);
    this.videoPreview.set(null);
    this.objectUrls.revoke('video');
    this.isExistingVideoDeleted.set(
      this.mode() === 'update' && !!this.existingVideoUrl() && !isCancellingNewUpload
    );
    this.emitChange();
  }

  openVideoModal(): void {
    this.isVideoModalOpen.set(true);
  }

  closeVideoModal(): void {
    this.isVideoModalOpen.set(false);
  }
}
