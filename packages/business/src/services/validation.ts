// Validation business logic service

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const createValidationResult = (): ValidationResult => ({
  valid: true,
  errors: [],
  warnings: [],
});

/**
 * Validate SKU format
 */
export const validateSku = (sku: string): boolean => {
  // SKU: 4-20 alphanumeric characters, hyphens, underscores
  const regex = /^[A-Za-z0-9_-]{4,20}$/;
  return regex.test(sku);
};

/**
 * Validate barcode formats (EAN-13, UPC-A, Code128)
 */
export const validateBarcode = (barcode: string): boolean => {
  if (!barcode) return true; // Barcode is optional
  
  // EAN-13: 13 digits
  if (/^\d{13}$/.test(barcode)) return true;
  
  // UPC-A: 12 digits
  if (/^\d{12}$/.test(barcode)) return true;
  
  // Code128: variable length alphanumeric
  if (/^[A-Za-z0-9 ]{1,80}$/.test(barcode)) return true;
  
  return false;
};

/**
 * Validate price value
 */
export const validatePrice = (price: number, allowNegative = false): ValidationResult => {
  const result = createValidationResult();
  
  if (isNaN(price)) {
    result.valid = false;
    result.errors.push('Price must be a valid number');
    return result;
  }
  
  if (!allowNegative && price < 0) {
    result.valid = false;
    result.errors.push('Price cannot be negative');
    return result;
  }
  
  if (price > 999999.99) {
    result.warnings.push('Price value is unusually high');
  }
  
  return result;
};

/**
 * Validate quantity value
 */
export const validateQuantity = (quantity: number, allowNegative = false): boolean => {
  if (isNaN(quantity)) return false;
  if (allowNegative) return true;
  return quantity >= 0 && Number.isInteger(quantity);
};
