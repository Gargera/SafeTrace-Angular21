// ================== Response DTOs ==================

/**
 * Mirrors SafeTrace.Application.DTOs.Chat.ChatSummaryDto.
 * One row in the "my conversations" list (GET /api/Chats).
 *
 * NOTE: this DTO does NOT include the other user's name, avatar, or the
 * case title - only `otherUserId` (a raw id). To show a friendly name/avatar
 * in the conversation list, the backend DTO would need to include those
 * fields (or the frontend would need a separate users lookup). Rather than
 * inventing a name/avatar field that doesn't exist on the backend, the
 * ConversationCardComponent below only renders what's actually here.
 */
export interface ChatSummaryDto {
  chatId: number;
  caseId: number;
  caseTitle: string;
  lastMessage?: string;
  lastMessageDate?: string; // ISO date string (C# DateTime?)
  unreadCount: number;
  otherUserId: string;
  otherUserName: string;
  otherUserImage?:string;
}
import {CaseType} from '../../../shared/enums/case-type';
export interface StartChatContextDto{
  caseId: number;
  caseTitle: string;
  caseImage?: string;
  caseType: CaseType;
  participantName: string;
  participantImage?: string;
  chatExists: boolean;
  chatId?: number;
}

/**
 * Mirrors SafeTrace.Application.DTOs.Chat.ChatDetailsDto.
 * Returned by POST /api/Chats/start and GET /api/Chats/{chatId}.
 *
 * senderName/receiverName/deleted*/
 /*senderDeletedAt/receiverDeletedAt are only
 * populated when the caller is an admin (see ChatService.GetChatDetailsAsync).
 * otherUserName is only populated for a normal (non-admin) caller.
 */
export interface ChatDetailsDto {
  chatId: number;
  caseId: number;
  caseTitle: string;
  caseImage: string;
  senderId: string;
  senderName?: string;
  senderImage?:string;
  receiverId: string;
  receiverName?: string;
  receiverImage?:string;
  otherUserId?:string;
  otherUserName?: string;
  otherUserImage?:string;
  createdAt: string; // ISO date string

  // Admin-only fields
  deletedBySender?: boolean;
  deletedByReceiver?: boolean;
  senderDeletedAt?: string;
  receiverDeletedAt?: string;
}

/**
 * Mirrors SafeTrace.Application.DTOs.Chat.AdminChatsDto.
 * One row in the admin "Chat Monitoring" table (GET /api/Chats/admin/chats).
 *
 * NOTE: like ChatSummaryDto, this has no case title and no user names -
 * only raw senderId/receiverId/caseId. The admin table below shows the
 * raw ids as-is instead of inventing a display name.
 */
export interface AdminChatsDto {
  chatId: number;
  caseId: number;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  messagesCount: number;
  unreadMessagesCount: number;
  createdAt: string;
  lastMessage?: string;
  isDeletedBySender: boolean;
  isDeletedByReceiver: boolean;
  senderDeletedAt?: string;
  receiverDeletedAt?: string;
}

// ================== Request DTOs ==================

/**
 * Mirrors SafeTrace.Application.DTOs.Chat.StartChatRequest.
 * POST /api/Chats/start - the backend derives the receiver from the case
 * owner and returns the existing chat if one already exists between the
 * caller and that case owner, so there's no participantId to send.
 */
export interface StartChatRequest {
  caseId: number;
}

/**
 * Mirrors SafeTrace.Application.DTOs.Chat.ChatFilterDto.
 * Sent as query params to GET /api/Chats/admin/chats.
 */
export interface ChatFilterDto {
  fromDate?: string; // ISO date string
  toDate?: string; // ISO date string
  isDeletedBySender?: boolean;
  isDeletedByReceiver?: boolean;
  search?: string;
}
