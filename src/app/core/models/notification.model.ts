import { NotificationType } from '../../shared/enums/Notification-Type';

export interface GetUserNotificationsDTO {
  id: number;
  isRead: boolean;
  createdAt: string;
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
