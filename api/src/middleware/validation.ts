// Input Validation Middleware
// Provides validation helpers for request bodies

import { ErrorDetail } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: ErrorDetail[];
}

export type Validator = (value: unknown, field: string) => ErrorDetail | null;

/**
 * Validate an object against a schema of validators
 */
export function validateObject(
  data: Record<string, unknown>,
  schema: Record<string, Validator[]>
): ValidationResult {
  const errors: ErrorDetail[] = [];

  for (const [field, validators] of Object.entries(schema)) {
    const value = data[field];
    for (const validator of validators) {
      const error = validator(value, field);
      if (error) {
        errors.push(error);
        break; // Stop at first error for this field
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Common Validators
// ============================================

/**
 * Required field validator
 */
export function required(): Validator {
  return (value, field) => {
    if (value === undefined || value === null || value === '') {
      return {
        field,
        code: 'REQUIRED',
        message: `${field} is required`,
      };
    }
    return null;
  };
}

/**
 * String type validator
 */
export function isString(): Validator {
  return (value, field) => {
    if (value !== undefined && value !== null && typeof value !== 'string') {
      return {
        field,
        code: 'INVALID_TYPE',
        message: `${field} must be a string`,
      };
    }
    return null;
  };
}

/**
 * Number type validator
 */
export function isNumber(): Validator {
  return (value, field) => {
    if (value !== undefined && value !== null && typeof value !== 'number') {
      return {
        field,
        code: 'INVALID_TYPE',
        message: `${field} must be a number`,
      };
    }
    return null;
  };
}

/**
 * Boolean type validator
 */
export function isBoolean(): Validator {
  return (value, field) => {
    if (value !== undefined && value !== null && typeof value !== 'boolean') {
      return {
        field,
        code: 'INVALID_TYPE',
        message: `${field} must be a boolean`,
      };
    }
    return null;
  };
}

/**
 * Array type validator
 */
export function isArray(): Validator {
  return (value, field) => {
    if (value !== undefined && value !== null && !Array.isArray(value)) {
      return {
        field,
        code: 'INVALID_TYPE',
        message: `${field} must be an array`,
      };
    }
    return null;
  };
}

/**
 * Object type validator
 */
export function isObject(): Validator {
  return (value, field) => {
    if (value !== undefined && value !== null && (typeof value !== 'object' || Array.isArray(value))) {
      return {
        field,
        code: 'INVALID_TYPE',
        message: `${field} must be an object`,
      };
    }
    return null;
  };
}

/**
 * Minimum length validator (for strings and arrays)
 */
export function minLength(min: number): Validator {
  return (value, field) => {
    if (value !== undefined && value !== null) {
      const length = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0;
      if (length < min) {
        return {
          field,
          code: 'MIN_LENGTH',
          message: `${field} must be at least ${min} characters`,
        };
      }
    }
    return null;
  };
}

/**
 * Maximum length validator (for strings and arrays)
 */
export function maxLength(max: number): Validator {
  return (value, field) => {
    if (value !== undefined && value !== null) {
      const length = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0;
      if (length > max) {
        return {
          field,
          code: 'MAX_LENGTH',
          message: `${field} must not exceed ${max} characters`,
        };
      }
    }
    return null;
  };
}

/**
 * Minimum value validator (for numbers)
 */
export function minValue(min: number): Validator {
  return (value, field) => {
    if (typeof value === 'number' && value < min) {
      return {
        field,
        code: 'MIN_VALUE',
        message: `${field} must be at least ${min}`,
      };
    }
    return null;
  };
}

/**
 * Maximum value validator (for numbers)
 */
export function maxValue(max: number): Validator {
  return (value, field) => {
    if (typeof value === 'number' && value > max) {
      return {
        field,
        code: 'MAX_VALUE',
        message: `${field} must not exceed ${max}`,
      };
    }
    return null;
  };
}

/**
 * Regex pattern validator
 */
export function pattern(regex: RegExp, message?: string): Validator {
  return (value, field) => {
    if (typeof value === 'string' && !regex.test(value)) {
      return {
        field,
        code: 'PATTERN_MISMATCH',
        message: message || `${field} does not match the required pattern`,
      };
    }
    return null;
  };
}

/**
 * Email format validator
 */
export function isEmail(): Validator {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern(emailRegex, 'Invalid email format');
}

/**
 * Phone number validator (international format)
 */
export function isPhone(): Validator {
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;
  return (value, field) => {
    if (typeof value === 'string') {
      const cleanPhone = value.replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return {
          field,
          code: 'INVALID_PHONE',
          message: `${field} must be a valid phone number`,
        };
      }
    }
    return null;
  };
}

/**
 * Date format validator (YYYY-MM-DD)
 */
export function isDate(): Validator {
  return (value, field) => {
    if (typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value) || isNaN(new Date(value).getTime())) {
        return {
          field,
          code: 'INVALID_DATE',
          message: `${field} must be a valid date (YYYY-MM-DD)`,
        };
      }
    }
    return null;
  };
}

/**
 * DateTime format validator (ISO 8601)
 */
export function isDateTime(): Validator {
  return (value, field) => {
    if (typeof value === 'string') {
      if (isNaN(new Date(value).getTime())) {
        return {
          field,
          code: 'INVALID_DATETIME',
          message: `${field} must be a valid ISO 8601 datetime`,
        };
      }
    }
    return null;
  };
}

/**
 * UUID format validator
 */
export function isUUID(): Validator {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern(uuidRegex, 'Must be a valid UUID');
}

/**
 * Enum validator
 */
export function isEnum<T extends string>(allowedValues: readonly T[]): Validator {
  return (value, field) => {
    if (value !== undefined && value !== null && !allowedValues.includes(value as T)) {
      return {
        field,
        code: 'INVALID_ENUM',
        message: `${field} must be one of: ${allowedValues.join(', ')}`,
      };
    }
    return null;
  };
}

/**
 * Currency code validator
 */
export function isCurrency(): Validator {
  const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'];
  return isEnum(currencies);
}

/**
 * Credit card number validator (Luhn algorithm)
 */
export function isCreditCard(): Validator {
  return (value, field) => {
    if (typeof value === 'string') {
      const cleanNumber = value.replace(/\D/g, '');
      if (cleanNumber.length < 13 || cleanNumber.length > 19) {
        return {
          field,
          code: 'INVALID_CARD_LENGTH',
          message: `${field} must be between 13 and 19 digits`,
        };
      }

      // Luhn algorithm
      let sum = 0;
      let isEven = false;
      for (let i = cleanNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cleanNumber[i], 10);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }

      if (sum % 10 !== 0) {
        return {
          field,
          code: 'INVALID_CARD_NUMBER',
          message: `${field} is not a valid card number`,
        };
      }
    }
    return null;
  };
}

/**
 * UPI ID validator
 */
export function isUPI(): Validator {
  const upiRegex = /^[a-zA-Z0-9.\-_]+@[a-zA-Z]+$/;
  return pattern(upiRegex, 'Must be a valid UPI ID (e.g., name@upi)');
}

// ============================================
// Validation Schemas for Common Requests
// ============================================

export const createUserSchema = {
  email: [required(), isString(), isEmail()],
  firstName: [required(), isString(), minLength(1), maxLength(50)],
  lastName: [isString(), maxLength(50)],
  phone: [isPhone()],
  password: [required(), isString(), minLength(8), maxLength(100)],
};

export const createBillSchema = {
  billerId: [required(), isString()],
  customerIdentifier: [required(), isString(), minLength(1), maxLength(50)],
  amount: [required(), isNumber(), minValue(0.01), maxValue(10000000)],
  currency: [isString(), isCurrency()],
  dueDate: [isDate()],
};

export const createPaymentSchema = {
  billId: [required(), isString()],
  amount: [required(), isNumber(), minValue(0.01), maxValue(10000000)],
  paymentMethodType: [required(), isString(), isEnum(['upi', 'credit_card', 'debit_card', 'net_banking', 'wallet'] as const)],
};

export const updateBillSchema = {
  nickname: [isString(), maxLength(100)],
  amount: [isNumber(), minValue(0.01), maxValue(10000000)],
  dueDate: [isDate()],
  status: [isString(), isEnum(['pending', 'paid', 'overdue', 'partially_paid', 'cancelled'] as const)],
};
