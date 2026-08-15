import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CacheService } from '../../../core/cache/cache.service';
import { CACHE_TAGS, CACHE_TTL } from '../../../core/cache/cache.constants';
import { AdminChatsDto, ChatDetailsDto, ChatFilterDto, ChatSummaryDto, StartChatRequest, StartChatContextDto } from '../models/chat.model';
import { MessageDto } from '../models/message.model';
import { AdminChatStatisticsDto } from '../models/admin-chat-statistics-dto';
import { environment } from '../../../../environments/environment';
import {ApiResponse} from '../../../shared/models/responses/api-response.model';
import {PaginationResponse} from '../../../shared/models/responses/pagination-response.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private cacheService = inject(CacheService);

private baseUrl = `${environment.baseUrl}/api/Chats`;

startChat(caseId: number): Observable<ApiResponse<StartChatContextDto>> {
    return this.http.get<ApiResponse<StartChatContextDto>>(`${this.baseUrl}/start-context/${caseId}`);
  } 

createChat(request: StartChatRequest): Observable<ApiResponse<ChatDetailsDto>> {
    return this.http.post<ApiResponse<ChatDetailsDto>>(`${this.baseUrl}/create`, request).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.CHAT]))
    );
  }

getMyChats(): Observable<ApiResponse<ChatSummaryDto[]>> {
    return this.cacheService.getOrSet(
      'MyChats_List',
      () => this.http.get<ApiResponse<ChatSummaryDto[]>>(`${this.baseUrl}`),
      CACHE_TTL.LIST,
      [CACHE_TAGS.CHAT]
    );
  }

getChatDetails(chatId: number): Observable<ApiResponse<ChatDetailsDto>> {
    return this.http.get<ApiResponse<ChatDetailsDto>>(`${this.baseUrl}/${chatId}`);
  }
getChatDetailsForAdmin(chatId: number): Observable<ApiResponse<ChatDetailsDto>> {
    return this.http.get<ApiResponse<ChatDetailsDto>>(`${this.baseUrl}/admin/${chatId}`);
  }
deleteChatForMe(chatId: number): Observable<ApiResponse<ChatDetailsDto>> {
    return this.http.delete<ApiResponse<ChatDetailsDto>>(`${this.baseUrl}/${chatId}`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.CHAT]))
    );
  }

getMessages(chatId: number): Observable<ApiResponse<MessageDto[]>> {
    return this.http.get<ApiResponse<MessageDto[]>>(`${this.baseUrl}/${chatId}/messages`);
  }
getMessagesForAdmin(chatId: number): Observable<ApiResponse<MessageDto[]>> {
    return this.http.get<ApiResponse<MessageDto[]>>(`${this.baseUrl}/admin/${chatId}/messages`);
  }
hardDeleteChat(chatId: number): Observable<ApiResponse<ChatDetailsDto>> {
    return this.http.delete<ApiResponse<ChatDetailsDto>>(`${this.baseUrl}/${chatId}/hard-delete`).pipe(
      tap(() => this.cacheService.invalidateByTags([CACHE_TAGS.CHAT]))
    );
  }

  private buildAdminChatsCacheKey(page: number, pageSize: number, filter?: ChatFilterDto): string {
    const filterState = {
      page,
      pageSize,
      search: filter?.search?.trim() || undefined,
      fromDate: filter?.fromDate || undefined,
      toDate: filter?.toDate || undefined,
      isDeletedBySender: filter?.isDeletedBySender,
      isDeletedByReceiver: filter?.isDeletedByReceiver
    };
    return `AdminChats_${JSON.stringify(filterState)}`;
  }

getAllChatsForAdmin(
  page: number,
  pageSize: number,
  filter?: ChatFilterDto
): Observable<ApiResponse<PaginationResponse<AdminChatsDto>>> {
    const cacheKey = this.buildAdminChatsCacheKey(page, pageSize, filter);

    return this.cacheService.getOrSet(
      cacheKey,
      () => {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (filter?.fromDate) params = params.set('fromDate', filter.fromDate);
        if (filter?.toDate) params = params.set('toDate', filter.toDate);
        if (filter?.isDeletedBySender !== undefined) params = params.set('isDeletedBySender', String(filter.isDeletedBySender));
        if (filter?.isDeletedByReceiver !== undefined) params = params.set('isDeletedByReceiver', String(filter.isDeletedByReceiver));
        if (filter?.search) params = params.set('search', filter.search);
        
        return this.http.get<ApiResponse<PaginationResponse<AdminChatsDto>>>(`${this.baseUrl}/admin/chats`, { params });
      },
      CACHE_TTL.LIST,
      [CACHE_TAGS.CHAT]
    );
  }

  getAdminStatistics(): Observable<ApiResponse<AdminChatStatisticsDto>> {
    return this.cacheService.getOrSet(
      'AdminChat_Statistics',
      () => this.http.get<ApiResponse<AdminChatStatisticsDto>>(`${this.baseUrl}/admin/statistics`),
      CACHE_TTL.LIST,
      [CACHE_TAGS.CHAT]
    );
  }

  getImageUrl(path: string | null | undefined): string {

    if (!path) {
      return 'images/defaultUser.jpg';
    }

    // لو الباك بيرجع URL كامل
    if (path.startsWith('http')) {
      return path;
    }

    return `${environment.filesBaseUrl}/${path}`;
  }
  
}
