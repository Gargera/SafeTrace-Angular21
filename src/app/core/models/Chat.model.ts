export interface ChatSummaryDto {
  chatId: number;
  caseId: number;
  lastMessage: string | null;
  lastMessageDate: string | null;
  unreadCount: number;
  otherUserId: string;
  otherUserName?: string | null;
}

export interface ChatDetailsDto {
  chatId: number;
  caseId: number;
  caseTitle: string;
  senderId: string;
  senderName: string | null;
  receiverId: string;
  receiverName: string | null;
  otherUserName: string | null;
  createdAt: string;
  // Admin-only fields
  deletedBySender?: boolean | null;
  deletedByReceiver?: boolean | null;
  senderDeletedAt?: string | null;
  receiverDeletedAt?: string | null;
}

export interface MessageDto {
  messageId: number;
  chatId: number;
  senderId: string;
  senderName: string | null;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface PaginatedMessagesDto {
  items: MessageDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface StartChatRequest {
  caseId: number;
}

export interface MessagesReadPayload {
  chatId: number;
  userId: string;
}
