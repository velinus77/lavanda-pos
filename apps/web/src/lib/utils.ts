export { formatCurrency, formatNumber, formatDate } from '@lavanda/shared';

export const formatPrice = (amount: number, locale: 'en' | 'ar' = 'en'): string => {
  return formatCurrency(amount, 'IQD', locale);
};

export const formatQty = (qty: number): string => {
  return formatNumber(qty);
};
