import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminChatsDto, ChatDetailsDto, ChatFilterDto, ChatSummaryDto, StartChatRequest, StartChatContextDto } from '../models/chat.model';
import { MessageDto } from '../models/message.model';
import { environment } from '../../../../environments/environment.development';
import {ApiResponse} from '../../../shared/models/responses/api-response.model';
import {PaginationResponse} from '../../../shared/models/responses/pagination-response.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);

private baseUrl = `${environment.baseUrl}/api/Chats`;

startChat(caseId: number): Observable<ApiResponse<StartChatContextDto>> {
    return this.http.get<ApiResponse<StartChatContextDto>>(`${this.baseUrl}/start-context/${caseId}`);
  } 

createChat(request: StartChatRequest): Observable<ApiResponse<ChatDetailsDto>> {
    return this.http.post<ApiResponse<ChatDetailsDto>>(`${this.baseUrl}/create`, request);
  }

getMyChats(): Observable<ApiResponse<ChatSummaryDto[]>> {
    return this.http.get<ApiResponse<ChatSummaryDto[]>>(`${this.baseUrl}`);
  }

getChatDetails(chatId: number): Observable<ApiResponse<ChatDetailsDto>> {
    return this.http.get<ApiResponse<ChatDetailsDto>>(`${this.baseUrl}/${chatId}`);
  }
deleteChatForMe(chatId: number): Observable<ApiResponse<ChatDetailsDto>> {
    return this.http.delete<ApiResponse<ChatDetailsDto>>(`${this.baseUrl}/${chatId}`);
  }

getMessages(chatId: number, page: number, pageSize: number = 50): Observable<ApiResponse<PaginationResponse<MessageDto>>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<ApiResponse<PaginationResponse<MessageDto>>>(`${this.baseUrl}/${chatId}/messages`, { params });
  }
hardDeleteChat(chatId: number): Observable<ApiResponse<ChatDetailsDto>> {
    return this.http.delete<ApiResponse<ChatDetailsDto>>(`${this.baseUrl}/${chatId}/hard-delete`);
  }

getAllChatsForAdmin(
  page: number,
  pageSize: number,
  filter?: ChatFilterDto
): Observable<ApiResponse<PaginationResponse<AdminChatsDto>>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (filter?.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter?.toDate) params = params.set('toDate', filter.toDate);
    if (filter?.isDeletedBySender !== undefined) params = params.set('isDeletedBySender', String(filter.isDeletedBySender));
    if (filter?.isDeletedByReceiver !== undefined) params = params.set('isDeletedByReceiver', String(filter.isDeletedByReceiver));
    if (filter?.search) params = params.set('search', filter.search);
    
    return this.http.get<ApiResponse<PaginationResponse<AdminChatsDto>>>(`${this.baseUrl}/admin/chats`, { params });
  }

  getImageUrl(path: string | null | undefined): string {
      console.log('Image Path:', path);

    if (!path) {
      return 'images/defaultUser.jpg';
    }

    // لو الباك بيرجع URL كامل
    if (path.startsWith('http')) {
      return path;
    }

    return `${environment.baseUrl}${path}`;
  }
  
}
