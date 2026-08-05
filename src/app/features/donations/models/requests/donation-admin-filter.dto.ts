import { PaymentStatus } from '../../../../shared/enums/payment-status.enum';

export interface DonationAdminFilterDto {
  pageNumber: number;
  pageSize: number;
  userEmail?: string;
  paymentStatus?: PaymentStatus | null;
}
