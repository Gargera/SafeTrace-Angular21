import { PaymentStatus } from '../../../../admin-dashboard/pages/donations/models/payment-status';

export interface DonationUserListDto {
  amount: number;
  paymentStatus: PaymentStatus;
  message: string | null;
  paidAt: Date | null;
}
