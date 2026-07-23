import { PaymentStatus } from '../../../../../shared/enums/payment-status.enum';

export interface DonationUserListDto {
  amount: number;
  paymentStatus: PaymentStatus;
  message: string | null;
  paidAt: Date | null;
}
