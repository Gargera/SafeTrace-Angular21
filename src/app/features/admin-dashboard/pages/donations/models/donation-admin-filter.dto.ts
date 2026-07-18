import { PaymentStatus } from './payment-status';

export interface DonationAdminFilterDto {
  pageNumber: number;
  pageSize: number;
  userEmail?: string;
  paymentStatus?: PaymentStatus | null;
}
