import { PaymentStatus } from '../../../../../shared/enums/payment-status.enum';

export interface DonationAdminListDto {
  amount: number;
  userEmail: string;
  paymentStatus: PaymentStatus;
  createAt: Date;
  message: string;
  paidAt?: Date;
}
