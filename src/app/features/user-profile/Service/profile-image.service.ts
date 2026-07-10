import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';

export interface UploadProfileImageResponse {
  imageUrl: string;
}

/**
 * Handles profile image upload/removal against the backend.
 * Adjust `baseUrl` to match your API route conventions.
 */
@Injectable({ providedIn: 'root' })
export class ProfileImageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/users/profile-image';

  readonly isUploading = signal(false);
  readonly isRemoving = signal(false);

  uploadProfileImage(blob: Blob, fileName = 'profile.png'): Observable<UploadProfileImageResponse> {
    const formData = new FormData();
    formData.append('file', blob, fileName);

    this.isUploading.set(true);
    return this.http.post<UploadProfileImageResponse>(this.baseUrl, formData).pipe(
      finalize(() => this.isUploading.set(false))
    );
  }

  removeProfileImage(): Observable<void> {
    this.isRemoving.set(true);
    return this.http.delete<void>(this.baseUrl).pipe(
      finalize(() => this.isRemoving.set(false))
    );
  }
}
