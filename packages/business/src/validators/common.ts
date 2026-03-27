// Common validators

export const isNotEmpty = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value.trim() !== '';
};

export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const isValidPhone = (phone: string, countryCode: 'IQ' | 'US' = 'IQ'): boolean => {
  const patterns: Record<string, RegExp> = {
    IQ: /^\+?964\d{9}$|^0\d{9}$|^\d{10}$/,
    US: /^\+?1\d{10}$|^\(\d{3}\)\s?\d{3}-\d{4}$/,
  };
  return patterns[countryCode].test(phone.replace(/[\s-()]/g, ''));
};

export const sanitizeString = (str: string): string => {
  return str.replace(/[<>"'&]/g, (match) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '&': '&amp;',
    };
    return entities[match] || match;
  });
};

export const trimToNull = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};
