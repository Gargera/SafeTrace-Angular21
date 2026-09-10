import {
  Component,
  DestroyRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ImageCroppedEvent, ImageCropperComponent, LoadedImage } from 'ngx-image-cropper';

/**
 * Modal crop dialog, shared by the profile photo and the ID photo. Wraps
 * ngx-image-cropper with:
 * - drag / pan (built into the cropper by default)
 * - pinch/slider zoom
 * - a fully free-form crop area — the user can resize width and height
 *   independently, with no fixed or enforced aspect ratio
 * - a live preview of the crop result
 *
 * The dialog never uploads anything itself — it only ever emits a Blob via
 * `saved` when the user clicks "حفظ". The parent decides what to do with
 * it (in edit-profile.ts: upload immediately via FormData).
 */
import { ButtonComponent } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-image-crop-dialog',
  standalone: true,
  imports: [ImageCropperComponent, ButtonComponent],
  templateUrl: './image-crop-dialog.html',
})
export class ImageCropDialog {
  readonly open = input.required<boolean>();
  readonly imageFile = input<File | null>(null);

  readonly saved = output<Blob>();
  readonly cancelled = output<void>();

  readonly zoom = signal(1);
  readonly isImageLoaded = signal(false);
  readonly croppedBlob = signal<Blob | null>(null);
  readonly previewUrl = signal<string | null>(null);

  #lastObjectUrl: string | null = null;
  #destroyRef = inject(DestroyRef);

  constructor() {
    // Keep the preview's object URL in sync with the latest crop, and
    // always revoke the previous one to avoid leaking memory.
    effect(() => {
      const blob = this.croppedBlob();

      if (this.#lastObjectUrl) {
        URL.revokeObjectURL(this.#lastObjectUrl);
        this.#lastObjectUrl = null;
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        this.#lastObjectUrl = url;
        this.previewUrl.set(url);
      } else {
        this.previewUrl.set(null);
      }
    });

    this.#destroyRef.onDestroy(() => {
      if (this.#lastObjectUrl) {
        URL.revokeObjectURL(this.#lastObjectUrl);
      }
    });
  }

  imageLoaded(_image: LoadedImage): void {
    this.isImageLoaded.set(true);
  }

  imageCropped(event: ImageCroppedEvent): void {
    this.croppedBlob.set(event.blob ?? null);
  }

  loadImageFailed(): void {
    this.isImageLoaded.set(false);
  }

  onZoomChange(value: number): void {
    this.zoom.set(value);
  }

  onSave(): void {
    const blob = this.croppedBlob();
    if (blob) {
      this.saved.emit(blob);
      this.#resetState();
    }
  }

  onCancel(): void {
    this.#resetState();
    this.cancelled.emit();
  }

  onBackdropClick(): void {
    this.onCancel();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.onCancel();
    }
  }

  #resetState(): void {
    this.zoom.set(1);
    this.isImageLoaded.set(false);
    this.croppedBlob.set(null);
  }
}
