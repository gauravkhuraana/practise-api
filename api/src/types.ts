// Types for Cloudflare Workers environment
export interface Env {
  DB: D1Database;
  API_VERSION: string;
  RATE_LIMIT_MAX: string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  DEMO_API_KEY: string;
  DEMO_JWT_TOKEN: string;
  DEMO_BASIC_USER: string;
  DEMO_BASIC_PASS: string;
  DEMO_OAUTH_CLIENT_ID: string;
  DEMO_OAUTH_CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string;
}

// Request context passed through middleware
export interface RequestContext {
  requestId: string;
  startTime: number;
  auth?: AuthContext;
  clientIp: string;
}

export interface AuthContext {
  type: 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'cookie' | 'none';
  identifier?: string;
  scopes?: string[];
}

// ============================================
// File Upload Types
// ============================================

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  userId?: string;
  metadata?: Record<string, string>;
}

export interface FileUploadResult {
  file: UploadedFile;
  url: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ErrorDetail[];
  traceId: string;
  timestamp: string;
}

export interface ErrorDetail {
  field: string;
  message: string;
  code: string;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  version: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // Offset-based pagination
  offset?: number;
  // Cursor-based pagination
  nextCursor?: string | null;
  prevCursor?: string | null;
}

// ============================================
// Domain Models
// ============================================

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  address?: Address;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Biller {
  id: string;
  name: string;
  displayName: string;
  category: BillerCategory;
  logoUrl?: string;
  description?: string;
  supportedPaymentModes: PaymentMode[];
  fetchBillSupported: boolean;
  partialPaymentAllowed: boolean;
  minAmount: number;
  maxAmount: number;
  customerIdLabel: string;
  customerIdPattern?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BillerCategory = 
  | 'telecom' 
  | 'electricity' 
  | 'water' 
  | 'gas' 
  | 'broadband' 
  | 'dth' 
  | 'insurance' 
  | 'credit_card' 
  | 'loan' 
  | 'municipal_tax';

export type PaymentMode = 'upi' | 'credit_card' | 'debit_card' | 'net_banking' | 'wallet';

export interface Bill {
  id: string;
  userId: string;
  billerId: string;
  billerName?: string;
  customerIdentifier: string;
  customerName?: string;
  nickname?: string;
  amount: Money;
  dueDate?: string;
  billDate?: string;
  billPeriod?: string;
  status: BillStatus;
  billDetails?: Record<string, unknown>;
  autoPay?: AutoPayConfig;
  createdAt: string;
  updatedAt: string;
}

export type BillStatus = 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'cancelled';

export interface Money {
  value: number;
  currency: string;
}

export interface AutoPayConfig {
  enabled: boolean;
  paymentMethodId?: string;
  maxAmount?: number;
  daysBefore?: number;
}

export interface Payment {
  id: string;
  billId: string;
  userId: string;
  amount: Money;
  convenienceFee: Money;
  totalAmount: Money;
  paymentMethod: PaymentMethodSummary;
  status: PaymentStatus;
  transactionId?: string;
  referenceNumber?: string;
  billerReference?: string;
  failureReason?: string;
  failureCode?: string;
  scheduledAt?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 
  | 'initiated' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'refunded' 
  | 'pending_refund';

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMode;
  displayName: string;
  isDefault: boolean;
  // UPI
  upiId?: string;
  // Card
  cardLastFour?: string;
  cardNetwork?: CardNetwork;
  cardExpiryMonth?: number;
  cardExpiryYear?: number;
  cardHolderName?: string;
  // Net Banking
  bankName?: string;
  bankAccountLastFour?: string;
  // Wallet
  walletProvider?: string;
  walletId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'rupay' | 'discover';

export interface PaymentMethodSummary {
  id?: string;
  type: PaymentMode;
  displayName?: string;
}

export interface Transaction {
  id: string;
  paymentId?: string;
  userId: string;
  type: TransactionType;
  amount: Money;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type TransactionType = 'payment' | 'refund' | 'reversal' | 'cashback' | 'fee';

export interface ScheduledPayment {
  id: string;
  billId: string;
  userId: string;
  paymentMethodId: string;
  amount: Money;
  scheduledDate: string;
  recurrence?: 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextRunDate?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';
  lastRunAt?: string;
  lastRunStatus?: string;
  runCount: number;
  maxRuns?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Request DTOs
// ============================================

export interface CreateUserRequest {
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  password: string;
  address?: Address;
}

export interface UpdateUserRequest {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: Address;
}

export interface CreateBillRequest {
  billerId: string;
  customerIdentifier: string;
  customerName?: string;
  nickname?: string;
  amount: number;
  currency?: string;
  dueDate?: string;
  billDate?: string;
  billPeriod?: string;
}

export interface UpdateBillRequest {
  nickname?: string;
  amount?: number;
  dueDate?: string;
  status?: BillStatus;
  autoPay?: AutoPayConfig;
}

export interface FetchBillRequest {
  billerId: string;
  customerIdentifier: string;
}

export interface CreatePaymentRequest {
  billId: string;
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  paymentMethodType: PaymentMode;
  // For new payment method
  upiId?: string;
  cardNumber?: string;
  cardExpiryMonth?: number;
  cardExpiryYear?: number;
  cardCvv?: string;
  cardHolderName?: string;
  bankCode?: string;
  walletProvider?: string;
  // Scheduling
  scheduledAt?: string;
}

export interface CreateScheduledPaymentRequest {
  billId: string;
  paymentMethodId: string;
  amount: number;
  currency?: string;
  scheduledDate: string;
  recurrence?: 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  maxRuns?: number;
}

export interface CreatePaymentMethodRequest {
  type: PaymentMode;
  displayName: string;
  isDefault?: boolean;
  // UPI
  upiId?: string;
  // Card
  cardNumber?: string;
  cardExpiryMonth?: number;
  cardExpiryYear?: number;
  cardHolderName?: string;
  // Net Banking
  bankName?: string;
  bankAccountNumber?: string;
  // Wallet
  walletProvider?: string;
}

// ============================================
// Query Parameters
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface BillerQueryParams extends PaginationParams {
  category?: BillerCategory;
  search?: string;
  isActive?: boolean;
}

export interface BillQueryParams extends PaginationParams {
  userId?: string;
  billerId?: string;
  status?: BillStatus;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface PaymentQueryParams extends PaginationParams {
  userId?: string;
  billId?: string;
  status?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransactionQueryParams extends PaginationParams {
  userId?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
}
