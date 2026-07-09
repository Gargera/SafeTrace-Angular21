import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MessageDto, SendMessageRequest } from '../models/message.model';
import { environment } from '../../../../environments/environment.development';
import {ApiResponse} from '../../../shared/models/responses/api-response.model';
import {PaginationResponse} from '../../../shared/models/responses/pagination-response.model';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private http = inject(HttpClient);
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
    return this.http.post<ApiResponse<MessageDto>>(`${this.baseUrl}/send`, formData);
  }

  markMessageAsRead(chatId: number): Observable<ApiResponse<number>> { 
    return this.http.put<ApiResponse<number>>(`${this.baseUrl}/${chatId}/read`, {});
  }

  deleteMessageForMe(messageId: number): Observable<ApiResponse<MessageDto>> {
    return this.http.delete<ApiResponse<MessageDto>>(`${this.baseUrl}/${messageId}`);
  }

  /** DELETE /api/Messages/{messageId}/everyone - Deletes a message for all chat participants. */
  deleteMessageForEveryone(messageId: number): Observable<ApiResponse<MessageDto>> {
    return this.http.delete<ApiResponse<MessageDto>>(`${this.baseUrl}/${messageId}/everyone`);
  }
}
