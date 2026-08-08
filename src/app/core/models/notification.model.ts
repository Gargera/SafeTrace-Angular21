import { NotificationType } from '../../shared/enums/Notification-Type';

export interface GetUserNotificationsDTO {
  id: number;
  isRead: boolean;
  createdAt: Date;
  type: NotificationType;
  content: string;
  notificationDirectLink: string | null;
}

export interface SendNotificationDTO {
  userId: string;
  content: string;
  type: NotificationType;
  notificationDirectLink: string | null;
}

export interface NotificationPage {
  items: GetUserNotificationsDTO[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ParsedCaseNotification {
  kind: 'approved' | 'rejected';
  caseId: string | number;
  caseCode: string;
  rejectionReason?: string;
  detailsUrl: string;
  updateUrl: string;
  fullMessage: string;
  raw: GetUserNotificationsDTO;
}
