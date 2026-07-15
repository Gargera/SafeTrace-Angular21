import { PaymentStatus } from './payment-status';

export interface DonationAdminFilterDto {
  pageNumber: number;
  pageSize: number;
  search?: string;
  paymentStatus?: PaymentStatus | null;
}
