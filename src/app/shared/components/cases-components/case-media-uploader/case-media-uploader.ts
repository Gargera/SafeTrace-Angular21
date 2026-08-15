import {
  Component,
  input,
  output,
  inject,
  signal,
  effect,
  DestroyRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { ImageService } from '../../../../shared/services/image.service';
import { CaseFileResponse } from '../../../../core/models/cases.model';
import { validateVideoFile } from '../../../../shared/validators/video-validation.validator';
import { CaseObjectUrlRegistry } from '../../../../shared/helper/cases-helper/case-form.helper';


export interface CaseMediaPayload {
  primaryImage: File | null;
  additionalImages: File[];
  video: File | null;
  deletedImageIds: number[];
  primaryPhotoId: number | null;
  originalPrimaryImage?: File | null;
}

@Component({
  selector: 'app-case-media-uploader',
  standalone: true,
  imports: [CommonModule, ImageCropperComponent],
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

  // Errors from Parent
  errors = input<{
    primary?: string | null;
    additional?: string | null;
    video?: string | null;
  }>({});

  mediaChange = output<CaseMediaPayload>();

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
  cropTargetExistingId = signal<number | null>(null);

  newPhotos = signal<File[]>([]);
  newPhotoPreviews = signal<string[]>([]);

  videoFile = signal<File | null>(null);

  // Local UI errors (for frontend validation before submit)
  localPrimaryError = signal<string | null>(null);
  localAdditionalError = signal<string | null>(null);
  localVideoError = signal<string | null>(null);
  existingPhotoEditError = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.objectUrls.revokeAll());
  }

  ngOnInit(): void {
    if (this.mode() === 'update') {
      const deletedIds = this.initialDeletedPhotoIds();
      this.deletedPhotoIds.set([...deletedIds]);
      this.localExistingPhotos.set(
        this.existingPhotos().filter((p) => !deletedIds.includes(p.id))
      );
      this.primaryPhotoId.set(this.initialPrimaryPhotoId());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
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
      const file = changes['initialVideoFile'].currentValue;
      this.videoFile.set(file || null);
      if (file) {
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
    this.mediaChange.emit(payload);
  }

  public validate(): boolean {
    let isValid = true;

    const hasPrimary = !!this.newPrimaryImage() || !!this.primaryPhotoId();
    if (!hasPrimary) {
      this.localPrimaryError.set('برجاء إضافة وتأطير الصورة الأساسية.');
      isValid = false;
    } else {
      this.localPrimaryError.set(null);
    }
    if (this.localAdditionalError() || this.localVideoError() || this.existingPhotoEditError()) {
      isValid = false;
    }

    return isValid;
  }

  // -------------------------------------------------------------
  // Existing Photos (Update Mode)
  // -------------------------------------------------------------

  removeExistingPhoto(photo: CaseFileResponse): void {
    this.localExistingPhotos.update((list) => list.filter((p) => p.id !== photo.id));
    this.deletedPhotoIds.update((ids) => [...ids, photo.id]);

    if (this.primaryPhotoId() === photo.id) {
      const next = this.localExistingPhotos()[0];
      this.primaryPhotoId.set(next ? next.id : null);
    }
    this.emitChange();
  }

  setExistingAsPrimary(photo: CaseFileResponse): void {
    this.primaryPhotoId.set(photo.id);
    this.newPrimaryImage.set(null);
    this.newPrimaryPreview.set(null);
    this.primaryImageSource.set(null);
    this.objectUrls.revoke('primary');
    this.emitChange();
  }

  async editExistingPhoto(photo: CaseFileResponse): Promise<void> {
    this.existingPhotoEditError.set(null);
    try {
      const response = await fetch(photo.imagePath, { mode: 'cors' });
      if (!response.ok) throw new Error('fetch failed');

      const blob = await response.blob();
      const file = new File([blob], `existing_${photo.id}.jpg`, {
        type: blob.type || 'image/jpeg',
      });

      const dt = new DataTransfer();
      dt.items.add(file);
      const fakeEvent = { target: { files: dt.files } } as unknown as Event;

      this.cropTargetExistingId.set(photo.id);
      this.pendingCropSource.set(file);
      this.tempCroppedBlob.set(null);
      this.cropImageEvent.set(fakeEvent);
    } catch {
      this.existingPhotoEditError.set('تعذر تحميل الصورة للتعديل. حاول مرة أخرى.');
    }
  }

  // -------------------------------------------------------------
  // Primary Photo
  // -------------------------------------------------------------

  onPrimaryPhotoSelected(event: Event): void {
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
    this.cropTargetExistingId.set(null);
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

    const targetId = this.cropTargetExistingId();
    const croppedFile = new File([blob], `primary_image_${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });

    if (targetId !== null) {
      // Editing an existing photo: treat it as "delete old + upload edited version"
      const wasPrimary = this.primaryPhotoId() === targetId;

      this.deletedPhotoIds.update((ids) => [...ids, targetId]);
      this.localExistingPhotos.update((list) => list.filter((p) => p.id !== targetId));

      if (wasPrimary) {
        this.newPrimaryImage.set(croppedFile);
        this.newPrimaryPreview.set(this.objectUrls.replace('primary', croppedFile));
        this.primaryImageSource.set(this.originalPrimaryImage() ?? this.pendingCropSource() ?? croppedFile);
        this.primaryPhotoId.set(null);
      } else {
        if (this.newPhotos().length >= 4) {
          this.localAdditionalError.set('وصلت للحد الأقصى للصور الإضافية.');
        } else {
          this.newPhotos.update((p) => [...p, croppedFile]);
          this.newPhotoPreviews.set(this.objectUrls.replaceMany('additional', this.newPhotos()) || []);
        }
      }
      this.cropTargetExistingId.set(null);
    } else {
      // Brand new primary
      this.newPrimaryImage.set(croppedFile);
      this.newPrimaryPreview.set(this.objectUrls.replace('primary', croppedFile));
      this.primaryImageSource.set(this.originalPrimaryImage() ?? this.pendingCropSource() ?? croppedFile);
      this.primaryPhotoId.set(null);
    }

    this.cropImageEvent.set(null);
    this.pendingCropSource.set(null);
    this.emitChange();
  }

  cancelCrop(): void {
    this.cropImageEvent.set(null);
    this.cropTargetExistingId.set(null);
    this.pendingCropSource.set(null);
    this.tempCroppedBlob.set(null);
  }

  reCropPrimary(): void {
    const source = this.originalPrimaryImage() ?? this.primaryImageSource() ?? this.newPrimaryImage();
    if (!source) return;
    this.cropTargetExistingId.set(null);
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
    const files = Array.from(input.files ?? []);
    // Most forms allow 4 or 5. Let's standardize to max 4 additional (so 5 total)
    const maxAdditional = 4;
    const remaining = maxAdditional - this.newPhotos().length;

    if (files.length > remaining) {
      this.localAdditionalError.set(`يمكنك إضافة ${remaining} صور جديدة كحد أقصى.`);
      input.value = '';
      return;
    }

    for (const f of files) {
      const validation = this.imageService.validate(f, 5);
      if (!validation.valid) {
        this.localAdditionalError.set(validation.errorMessage ?? null);
        input.value = '';
        return;
      }
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
    this.emitChange();
  }
}
