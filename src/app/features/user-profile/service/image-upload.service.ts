import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';

export interface UploadImageResponse {
  imageUrl: string;
}

export type ImageUploadKind = 'profile-image' | 'id-image';

/**
 * Generic image upload/removal service, reused for both the profile
 * photo and the ID photo. Pass the kind, it hits the matching endpoint.
 */
@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/users';

  readonly isUploading = signal(false);
  readonly isRemoving = signal(false);

  uploadImage(
    kind: ImageUploadKind,
    blob: Blob,
    fileName = 'image.png',
  ): Observable<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', blob, fileName);

    this.isUploading.set(true);
    return this.http
      .post<UploadImageResponse>(`${this.baseUrl}/${kind}`, formData)
      .pipe(finalize(() => this.isUploading.set(false)));
  }

  removeImage(kind: ImageUploadKind): Observable<void> {
    this.isRemoving.set(true);
    return this.http
      .delete<void>(`${this.baseUrl}/${kind}`)
      .pipe(finalize(() => this.isRemoving.set(false)));
  }
}
