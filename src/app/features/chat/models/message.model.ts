/**
 * Mirrors SafeTrace.Application.DTOs.Message.MessageDto.
 * There is no "location" attachment type on the backend - only Image/Video/Document
 * via FileType, each with a single filePath. The previous frontend-only
 * 'location' attachment type has been removed since it doesn't exist here.
 */
import { FileType } from '../../../shared/enums/file-type';

export interface MessageDto {
  id: number;
  chatId: number;
  senderId: string;
  receiverId: string;
  content?: string;
  fileType?: FileType;
  filePath?: string;
  isRead: boolean;
  isMine: boolean;
  isDeletedForEveryone: boolean;
  deletedBySender: boolean;
  deletedByReceiver: boolean;
  forEveryoneDeletedAt?: string; // ISO date string
  senderDeletedAt?: string;
  receiverDeletedAt?: string;
  sendAt: string; // ISO date string
}

/**
 * Mirrors SafeTrace.Application.DTOs.Message.SendMessageRequest.
 * `file` is a plain browser File (IFormFile on the backend), so this request
 * must be sent as multipart/form-data, not JSON - see ChatService.sendMessage().
 */
export interface SendMessageRequest {
  chatId: number;
  content?: string;
  file?: File;
}
