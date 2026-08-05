export interface AdminChatStatisticsDto {
  totalChats: number;
  activeChats: number;
  deletedBySenderOnly: number;
  deletedByReceiverOnly: number;
  deletedByBoth: number;
  totalUnreadMessages: number;
}
