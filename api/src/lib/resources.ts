// Resource registry for the shared query engine.
//
// Each entry describes how a resource maps onto SQL: which columns are
// queryable, what a full row selection looks like, and how a row becomes the
// public JSON shape. The HTTP QUERY handlers and the GET list endpoints both
// read from here, so filtering and sorting stay consistent between them.

import { ResourceDef } from './query';
import { formatBiller } from '../routes/billers';
import { formatBill } from '../routes/bills';
import { formatPayment } from '../routes/payments';
import { formatUser } from '../routes/users';

export const billersResource: ResourceDef = {
  name: 'billers',
  select: '*',
  from: 'billers',
  defaultSort: 'category ASC, display_name ASC',
  format: formatBiller,
  fields: {
    id: { column: 'id', type: 'string' },
    name: { column: 'name', type: 'string' },
    displayName: { column: 'display_name', type: 'string' },
    category: { column: 'category', type: 'string' },
    description: { column: 'description', type: 'string' },
    fetchBillSupported: { column: 'fetch_bill_supported', type: 'boolean' },
    partialPaymentAllowed: { column: 'partial_payment_allowed', type: 'boolean' },
    minAmount: { column: 'min_amount', type: 'number' },
    maxAmount: { column: 'max_amount', type: 'number' },
    customerIdLabel: { column: 'customer_id_label', type: 'string' },
    isActive: { column: 'is_active', type: 'boolean' },
    createdAt: { column: 'created_at', type: 'date' },
    updatedAt: { column: 'updated_at', type: 'date' },
  },
};

export const billsResource: ResourceDef = {
  name: 'bills',
  select: 'b.*, bl.display_name as biller_name, bl.category as biller_category',
  from: 'bills b LEFT JOIN billers bl ON b.biller_id = bl.id',
  defaultSort: 'b.due_date ASC, b.created_at DESC',
  format: formatBill,
  fields: {
    id: { column: 'b.id', type: 'string' },
    userId: { column: 'b.user_id', type: 'string' },
    billerId: { column: 'b.biller_id', type: 'string' },
    customerIdentifier: { column: 'b.customer_identifier', type: 'string' },
    customerName: { column: 'b.customer_name', type: 'string' },
    nickname: { column: 'b.nickname', type: 'string' },
    amount: { column: 'b.amount', type: 'number' },
    currency: { column: 'b.currency', type: 'string' },
    dueDate: { column: 'b.due_date', type: 'date' },
    billDate: { column: 'b.bill_date', type: 'date' },
    billPeriod: { column: 'b.bill_period', type: 'string' },
    status: { column: 'b.status', type: 'string' },
    autoPayEnabled: { column: 'b.auto_pay_enabled', type: 'boolean' },
    createdAt: { column: 'b.created_at', type: 'date' },
    updatedAt: { column: 'b.updated_at', type: 'date' },
    billerName: { column: 'bl.display_name', type: 'string' },
    billerCategory: { column: 'bl.category', type: 'string' },
  },
};

export const paymentsResource: ResourceDef = {
  name: 'payments',
  select:
    'p.*, b.customer_identifier, b.nickname as bill_nickname, bl.display_name as biller_name',
  from:
    'payments p LEFT JOIN bills b ON p.bill_id = b.id LEFT JOIN billers bl ON b.biller_id = bl.id',
  defaultSort: 'p.created_at DESC',
  format: formatPayment,
  fields: {
    id: { column: 'p.id', type: 'string' },
    billId: { column: 'p.bill_id', type: 'string' },
    userId: { column: 'p.user_id', type: 'string' },
    amount: { column: 'p.amount', type: 'number' },
    currency: { column: 'p.currency', type: 'string' },
    convenienceFee: { column: 'p.convenience_fee', type: 'number' },
    totalAmount: { column: 'p.total_amount', type: 'number' },
    paymentMethodId: { column: 'p.payment_method_id', type: 'string' },
    paymentMethodType: { column: 'p.payment_method_type', type: 'string' },
    status: { column: 'p.status', type: 'string' },
    transactionId: { column: 'p.transaction_id', type: 'string' },
    referenceNumber: { column: 'p.reference_number', type: 'string' },
    failureCode: { column: 'p.failure_code', type: 'string' },
    scheduledAt: { column: 'p.scheduled_at', type: 'date' },
    processedAt: { column: 'p.processed_at', type: 'date' },
    createdAt: { column: 'p.created_at', type: 'date' },
    updatedAt: { column: 'p.updated_at', type: 'date' },
    billerName: { column: 'bl.display_name', type: 'string' },
  },
};

export const usersResource: ResourceDef = {
  name: 'users',
  select: '*',
  from: 'users',
  defaultSort: 'created_at DESC',
  format: formatUser,
  fields: {
    id: { column: 'id', type: 'string' },
    email: { column: 'email', type: 'string' },
    phone: { column: 'phone', type: 'string' },
    firstName: { column: 'first_name', type: 'string' },
    lastName: { column: 'last_name', type: 'string' },
    kycStatus: { column: 'kyc_status', type: 'string' },
    city: { column: 'city', type: 'string' },
    state: { column: 'state', type: 'string' },
    postalCode: { column: 'postal_code', type: 'string' },
    country: { column: 'country', type: 'string' },
    createdAt: { column: 'created_at', type: 'date' },
    updatedAt: { column: 'updated_at', type: 'date' },
  },
};

/** Resources that expose the HTTP QUERY method. */
export const QUERYABLE_RESOURCES: Record<string, ResourceDef> = {
  billers: billersResource,
  bills: billsResource,
  payments: paymentsResource,
  users: usersResource,
};
