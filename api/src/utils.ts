// Utility functions for the API

import { ApiError, ApiResponse, PaginationMeta, ResponseMeta } from './types';

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a transaction ID with prefix
 */
export function generateTransactionId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${date}${random}`;
}

/**
 * Generate a reference number
 */
export function generateReferenceNumber(): string {
  const random = Math.random().toString().substring(2, 14);
  return `REF${random}`;
}

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  meta: Partial<ResponseMeta> = {}
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId: meta.requestId || generateId(),
      timestamp: getCurrentTimestamp(),
      version: meta.version || 'v1',
      pagination: meta.pagination,
    },
  };
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  meta: Partial<ResponseMeta> = {}
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      requestId: meta.requestId || generateId(),
      timestamp: getCurrentTimestamp(),
      version: meta.version || 'v1',
      pagination,
    },
  };
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  requestId: string,
  details?: ApiError['details']
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      traceId: requestId,
      timestamp: getCurrentTimestamp(),
    },
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number,
  options?: { includeCursors?: boolean; lastItemId?: string | number }
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  const result: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    offset,
  };
  
  // Add cursor-based navigation if requested
  if (options?.includeCursors) {
    result.nextCursor = hasNext ? encodeCursor({ offset: offset + limit, id: options.lastItemId }) : null;
    result.prevCursor = hasPrev ? encodeCursor({ offset: Math.max(0, offset - limit) }) : null;
  }
  
  return result;
}

// ============================================
// Cursor-based Pagination Utilities
// ============================================

export interface CursorData {
  offset?: number;
  id?: string | number;
  timestamp?: string;
}

/**
 * Encode cursor data to base64 string
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  // Use base64url encoding (URL-safe)
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode cursor string back to data
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    // Restore base64 from base64url
    let base64 = cursor.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Parse cursor and extract offset for database query
 */
export function getCursorOffset(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const data = decodeCursor(cursor);
  return data?.offset || 0;
}

/**
 * Pagination mode types
 */
export type PaginationMode = 'page' | 'offset' | 'cursor';

export interface ParsedPaginationParams {
  page: number;
  limit: number;
  offset: number;
  mode: PaginationMode;
  cursor?: string;
}

/**
 * Parse pagination params from URL
 * Supports three modes:
 * - Page-based: ?page=2&limit=10 (default)
 * - Offset-based: ?offset=20&limit=10
 * - Cursor-based: ?cursor=eyJpZCI6MTB9&limit=10
 */
export function parsePaginationParams(url: URL): ParsedPaginationParams {
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
  
  // Check for cursor-based pagination first
  const cursor = url.searchParams.get('cursor');
  if (cursor) {
    const decoded = decodeCursor(cursor);
    return {
      page: 1,
      limit,
      offset: decoded?.offset || 0,
      mode: 'cursor',
      cursor,
    };
  }
  
  // Check for direct offset parameter
  const offsetParam = url.searchParams.get('offset');
  if (offsetParam !== null) {
    const offset = Math.max(0, parseInt(offsetParam, 10));
    const page = Math.floor(offset / limit) + 1;
    return { page, limit, offset, mode: 'offset' };
  }
  
  // Default to page-based pagination
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset, mode: 'page' };
}

/**
 * Parse boolean query param
 */
export function parseBooleanParam(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  return value === 'true' || value === '1';
}

/**
 * Convert database row to camelCase object
 */
export function toCamelCase<T extends Record<string, unknown>>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

/**
 * Convert camelCase object to snake_case for database
 */
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (basic international format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * Validate datetime format (ISO 8601)
 */
export function isValidDateTime(datetime: string): boolean {
  const d = new Date(datetime);
  return !isNaN(d.getTime());
}

/**
 * Mask card number (show last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  return cardNumber.slice(-4);
}

/**
 * Mask bank account (show last 4 digits)
 */
export function maskBankAccount(accountNumber: string): string {
  return accountNumber.slice(-4);
}

/**
 * Detect card network from card number
 */
export function detectCardNetwork(cardNumber: string): string | null {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'amex';
  if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
  if (/^(508|60|65|81|82)/.test(cleanNumber)) return 'rupay';
  
  return null;
}

/**
 * Validate Luhn algorithm for card numbers
 */
export function isValidCardNumber(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;
  
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
  
  return sum % 10 === 0;
}

/**
 * Create HTTP response with JSON and appropriate headers
 */
export function jsonResponse<T>(
  data: ApiResponse<T>,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create empty response for HEAD requests
 */
export function headResponse(exists: boolean, headers: Record<string, string> = {}): Response {
  return new Response(null, {
    status: exists ? 200 : 404,
    headers: {
      'Content-Length': '0',
      ...headers,
    },
  });
}

/**
 * Create OPTIONS response
 */
export function optionsResponse(allowedMethods: string[], headers: Record<string, string> = {}): Response {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: allowedMethods.join(', '),
      'Access-Control-Allow-Methods': allowedMethods.join(', '),
      ...headers,
    },
  });
}

// ============================================
// XML Support Utilities
// ============================================

/**
 * Simple XML to JSON parser (handles basic XML structures)
 */
export function parseXml(xml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  // Remove XML declaration if present
  xml = xml.replace(/<\?xml[^?]*\?>/g, '').trim();
  
  // Get root element
  const rootMatch = xml.match(/^<(\w+)[^>]*>([\s\S]*)<\/\1>$/);
  if (!rootMatch) {
    throw new Error('Invalid XML format');
  }
  
  const [, rootTag, content] = rootMatch;
  result[rootTag] = parseXmlContent(content);
  
  return result;
}

function parseXmlContent(content: string): unknown {
  content = content.trim();
  
  // Check if it's a simple text value
  if (!content.includes('<')) {
    // Try to parse as number or boolean
    if (content === 'true') return true;
    if (content === 'false') return false;
    if (content !== '' && !isNaN(Number(content))) return Number(content);
    return content;
  }
  
  const result: Record<string, unknown> = {};
  
  // Match all child elements
  const elementRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>|<(\w+)([^/>]*)\s*\/>/g;
  let match;
  
  while ((match = elementRegex.exec(content)) !== null) {
    const tagName = match[1] || match[4];
    const innerContent = match[3] || '';
    
    const value = parseXmlContent(innerContent);
    
    // Handle arrays (multiple elements with same name)
    if (result[tagName] !== undefined) {
      if (!Array.isArray(result[tagName])) {
        result[tagName] = [result[tagName]];
      }
      (result[tagName] as unknown[]).push(value);
    } else {
      result[tagName] = value;
    }
  }
  
  return Object.keys(result).length > 0 ? result : content;
}

/**
 * Convert JSON object to XML string
 */
export function jsonToXml(obj: unknown, rootName: string = 'root'): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += objectToXml(obj, rootName);
  return xml;
}

function objectToXml(obj: unknown, tagName: string): string {
  if (obj === null || obj === undefined) {
    return `<${tagName}/>`;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => objectToXml(item, tagName)).join('\n');
  }
  
  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) {
      return `<${tagName}/>`;
    }
    
    const content = entries.map(([key, value]) => objectToXml(value, key)).join('\n');
    return `<${tagName}>\n${content}\n</${tagName}>`;
  }
  
  // Escape special XML characters
  const escaped = String(obj)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  return `<${tagName}>${escaped}</${tagName}>`;
}

/**
 * Create HTTP response with XML and appropriate headers
 */
export function xmlResponse<T>(
  data: T,
  rootName: string = 'response',
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(jsonToXml(data, rootName), {
    status,
    headers: {
      'Content-Type': 'application/xml',
      ...headers,
    },
  });
}

/**
 * Detect if request prefers XML response
 */
export function prefersXml(request: Request): boolean {
  const accept = request.headers.get('Accept') || '';
  const contentType = request.headers.get('Content-Type') || '';
  
  // Check Accept header for XML preference
  if (accept.includes('application/xml') || accept.includes('text/xml')) {
    // Check if JSON is also present and has higher priority
    const xmlIndex = Math.min(
      accept.indexOf('application/xml'),
      accept.indexOf('text/xml') !== -1 ? accept.indexOf('text/xml') : Infinity
    );
    const jsonIndex = accept.indexOf('application/json');
    
    if (jsonIndex === -1 || xmlIndex < jsonIndex) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if request body is XML
 */
export function isXmlRequest(request: Request): boolean {
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.includes('application/xml') || contentType.includes('text/xml');
}

/**
 * Create response in format matching Accept header (JSON or XML)
 */
export function formatResponse<T>(
  request: Request,
  data: ApiResponse<T>,
  rootName: string = 'response',
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  if (prefersXml(request)) {
    return xmlResponse(data, rootName, status, headers);
  }
  return jsonResponse(data, status, headers);
}
