import { formatCurrency, formatNumber, formatDate } from '@lavanda/shared';

export { formatCurrency, formatNumber, formatDate };

export const formatPrice = (amount: number, locale: 'en' | 'ar' = 'en'): string => {
  return formatCurrency(amount, 'IQD', locale);
};

export const formatQty = (qty: number): string => {
  return formatNumber(qty);
};
