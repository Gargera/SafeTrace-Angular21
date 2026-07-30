import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';
import { CaseListItemResponse } from '../../../core/models/cases.model';

export interface AiMatchedCase extends CaseListItemResponse {
  similarity: number;
}

@Injectable({
  providedIn: 'root'
})
export class AiMatchingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.baseUrl}/api/AiMatching`;

  // Cache state for back navigation
  cachedResults = signal<AiMatchedCase[]>([]);
  cachedImagePreview = signal<string | null>(null);
  cachedImageFile = signal<File | null>(null);

  clearCache() {
    this.cachedResults.set([]);
    this.cachedImagePreview.set(null);
    this.cachedImageFile.set(null);
  }

  searchFace(image: File): Observable<ApiResponse<AiMatchedCase[]>> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post<ApiResponse<AiMatchedCase[]>>(`${this.baseUrl}/search`, formData);
  }
}
