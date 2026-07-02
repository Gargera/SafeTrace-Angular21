import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ChatDetailsDto, ChatSummaryDto, PaginatedMessagesDto, StartChatRequest } from '../models/Chat.model';


@Injectable({ providedIn: 'root' })
export class ChatService {
  readonly #http = inject(HttpClient);
  readonly #base = `${environment.apiBaseUrl}/Chats`;

  /** POST /api/Chats/start — start or get existing chat for a case */
  startOrGetChat(caseId: number): Observable<ChatDetailsDto> {
    const body: StartChatRequest = { caseId };
    return this.#http.post<ChatDetailsDto>(`${this.#base}/start`, body);
  }

  /** GET /api/Chats — get current user's chat list */
  getUserChats(): Observable<ChatSummaryDto[]> {
    return this.#http.get<ChatSummaryDto[]>(this.#base);
  }

  /** GET /api/Chats/:chatId — get chat details */
  getChatDetails(chatId: number): Observable<ChatDetailsDto> {
    return this.#http.get<ChatDetailsDto>(`${this.#base}/${chatId}`);
  }

  /** GET /api/Chats/:chatId/messages — paginated messages */
  getMessages(chatId: number, page = 1, pageSize = 20): Observable<PaginatedMessagesDto> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.#http.get<PaginatedMessagesDto>(`${this.#base}/${chatId}/messages`, { params });
  }

  /** DELETE /api/Chats/:chatId — soft delete (user) */
  deleteChat(chatId: number): Observable<unknown> {
    return this.#http.delete(`${this.#base}/${chatId}`);
  }
}
