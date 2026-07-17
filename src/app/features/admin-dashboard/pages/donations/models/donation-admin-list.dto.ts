import { PaymentStatus } from './payment-status';

export interface DonationAdminListDto {
  amount: number;
  userEmail: string;
  paymentStatus: PaymentStatus;
  createAt: Date;
  message: string;
  paidAt?: Date;
}
