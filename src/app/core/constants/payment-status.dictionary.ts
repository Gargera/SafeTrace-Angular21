import { PaymentStatus } from '../../shared/enums/payment-status.enum';

export const PaymentStatusDictionary: Record<
  PaymentStatus | string,
  { label: string; icon: string; classes: string }
> = {
  [PaymentStatus.Pending]: {
    label: 'قيد الانتظار',
    icon: 'hourglass_empty',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  [PaymentStatus.Succeeded]: {
    label: 'ناجح',
    icon: 'check_circle',
    classes: 'bg-green-100 text-green-800 border-green-200',
  },
  [PaymentStatus.Failed]: {
    label: 'فشل',
    icon: 'cancel',
    classes: 'bg-red-100 text-red-800 border-red-200',
  },
  [PaymentStatus.Cancelled]: {
    label: 'ملغي',
    icon: 'block',
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  [PaymentStatus.Refunded]: {
    label: 'مسترد',
    icon: 'replay',
    classes: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};
