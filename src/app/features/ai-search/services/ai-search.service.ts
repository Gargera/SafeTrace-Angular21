import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../../shared/models/api-response.model';
import { CaseListItemResponse } from '../../../core/models/cases.model';
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TTL, CACHE_TAGS } from '../../../core/cache/cache.constants';

export interface AiMatchedCase extends CaseListItemResponse {
  similarity: number;
}

export interface AiSearchCache {
  results: AiMatchedCase[];
  imagePreview: string | null;
  imageFile: File | null;
}

@Injectable({
  providedIn: 'root'
})
export class AiMatchingService {
  private http = inject(HttpClient);
  private cacheService = inject(CacheService);
  private baseUrl = `${environment.baseUrl}/api/AiMatching`;
  private readonly CACHE_KEY = 'AI_SEARCH_STATE';

  getCache(): AiSearchCache | null {
    return this.cacheService.get<AiSearchCache>(this.CACHE_KEY);
  }

  saveCache(state: AiSearchCache) {
    this.cacheService.set(this.CACHE_KEY, state, CACHE_TTL.UI_STATE, [CACHE_TAGS.UI_STATE]);
  }

  clearCache() {
    this.cacheService.remove(this.CACHE_KEY);
  }

  searchFace(image: File): Observable<ApiResponse<AiMatchedCase[]>> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post<ApiResponse<AiMatchedCase[]>>(`${this.baseUrl}/search`, formData);
  }
}
