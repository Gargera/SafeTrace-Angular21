import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TAGS } from '../../../core/cache/cache.constants';
import { MessageDto, SendMessageRequest } from '../models/message.model';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/responses/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private http = inject(HttpClient);
  private cacheService = inject(CacheService);
  private baseUrl = `${environment.baseUrl}/api/Messages`;

  sendMessage(request: SendMessageRequest): Observable<ApiResponse<MessageDto>> {
    const formData = new FormData();
    formData.append('chatId', String(request.chatId));
    if (request.content) {
      formData.append('content', request.content);
    }
    if (request.file) {
      formData.append('file', request.file);
    }
    return this.http.post<ApiResponse<MessageDto>>(`${this.baseUrl}/send`, formData).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.CHAT]))
    );
  }

  markMessageAsRead(chatId: number): Observable<ApiResponse<number>> {
    return this.http.put<ApiResponse<number>>(`${this.baseUrl}/${chatId}/read`, {}).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.CHAT]))
    );
  }

  deleteMessageForMe(messageId: number): Observable<ApiResponse<MessageDto>> {
    return this.http.delete<ApiResponse<MessageDto>>(`${this.baseUrl}/${messageId}`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.CHAT]))
    );
  }

  /** DELETE /api/Messages/{messageId}/everyone - Deletes a message for all chat participants. */
  deleteMessageForEveryone(messageId: number): Observable<ApiResponse<MessageDto>> {
    return this.http.delete<ApiResponse<MessageDto>>(`${this.baseUrl}/${messageId}/everyone`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.CHAT]))
    );
  }
}
