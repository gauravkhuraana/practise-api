// Payments Routes - Payment Processing

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext } from '../types';
import {
  jsonResponse,
  errorResponse,
  successResponse,
  paginatedResponse,
  calculatePagination,
  parsePaginationParams,
  generateId,
  generateTransactionId,
  generateReferenceNumber,
  getCurrentTimestamp,
} from '../utils';

export const paymentsRouter = Router({ base: '/v1/payments' });

type PaymentStatus = 'initiated' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'pending_refund';

// ============================================
// GET /v1/payments - List payments
// ============================================
paymentsRouter.get('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const { page, limit, offset, mode } = parsePaginationParams(url);

  const userId = url.searchParams.get('user_id');
  const billId = url.searchParams.get('bill_id');
  const status = url.searchParams.get('status') as PaymentStatus | null;
  const createdBy = url.searchParams.get('created_by');
  const fromDate = url.searchParams.get('from_date');
  const toDate = url.searchParams.get('to_date');

  try {
    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (userId) {
      whereClause += ' AND p.user_id = ?';
      params.push(userId);
    }

    if (billId) {
      whereClause += ' AND p.bill_id = ?';
      params.push(billId);
    }

    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }

    if (createdBy) {
      whereClause += ' AND p.created_by = ?';
      params.push(createdBy);
    }

    if (fromDate) {
      whereClause += ' AND p.created_at >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      whereClause += ' AND p.created_at <= ?';
      params.push(toDate);
    }

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM payments p ${whereClause}`
    )
      .bind(...params)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    const payments = await env.DB.prepare(
      `SELECT p.*, b.customer_identifier, b.nickname as bill_nickname, 
              bl.display_name as biller_name
       FROM payments p
       LEFT JOIN bills b ON p.bill_id = b.id
       LEFT JOIN billers bl ON b.biller_id = bl.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, limit, offset)
      .all();

    const data = (payments.results || []).map((row) => formatPayment(row));
    const lastItem = data[data.length - 1];
    const pagination = calculatePagination(page, limit, total, {
      includeCursors: mode === 'cursor' || url.searchParams.has('include_cursors'),
      lastItemId: lastItem?.id,
    });

    return jsonResponse(
      paginatedResponse(data, pagination, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching payments:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch payments', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/payments/stats - Payment statistics
// ============================================
paymentsRouter.get('/stats', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');

  try {
    let whereClause = userId ? 'WHERE user_id = ?' : '';
    const params = userId ? [userId] : [];

    const result = await env.DB.prepare(
      `SELECT 
         status,
         COUNT(*) as count,
         SUM(total_amount) as total_amount,
         AVG(total_amount) as avg_amount
       FROM payments ${whereClause}
       GROUP BY status`
    )
      .bind(...params)
      .all();

    const stats: Record<string, any> = {};
    let grandTotal = 0;
    let grandCount = 0;

    for (const row of result.results || []) {
      const r = row as any;
      stats[r.status] = {
        count: r.count,
        totalAmount: r.total_amount || 0,
        avgAmount: Math.round((r.avg_amount || 0) * 100) / 100,
      };
      if (r.status === 'completed') {
        grandTotal += r.total_amount || 0;
        grandCount += r.count;
      }
    }

    return jsonResponse(
      successResponse(
        {
          byStatus: stats,
          completed: {
            count: grandCount,
            totalAmount: grandTotal,
          },
        },
        { requestId, version: env.API_VERSION }
      ),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching stats:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch statistics', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/payments/:id - Get payment by ID
// ============================================
paymentsRouter.get('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Payment ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const payment = await env.DB.prepare(
      `SELECT p.*, b.customer_identifier, b.nickname as bill_nickname, 
              bl.display_name as biller_name
       FROM payments p
       LEFT JOIN bills b ON p.bill_id = b.id
       LEFT JOIN billers bl ON b.biller_id = bl.id
       WHERE p.id = ?`
    )
      .bind(id)
      .first();

    if (!payment) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Payment with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    return jsonResponse(
      successResponse(formatPayment(payment), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching payment:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch payment', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/payments - Create/initiate payment
// ============================================
paymentsRouter.post('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  try {
    const body = await request.json();
    const errors = validatePaymentInput(body);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid payment data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    // Verify bill exists and get details
    const bill = await env.DB.prepare(
      `SELECT b.*, bl.display_name as biller_name, bl.min_amount, bl.max_amount
       FROM bills b
       JOIN billers bl ON b.biller_id = bl.id
       WHERE b.id = ?`
    )
      .bind(body.billId || body.bill_id)
      .first<any>();

    if (!bill) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Bill with ID '${body.billId || body.bill_id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    // Validate amount against biller limits
    const amount = body.amount;
    if (amount < bill.min_amount || amount > bill.max_amount) {
      return jsonResponse(
        errorResponse(
          'VALIDATION_ERROR',
          `Amount must be between ${bill.min_amount} and ${bill.max_amount}`,
          requestId,
          [{ field: 'amount', code: 'OUT_OF_RANGE', message: `Amount must be between ${bill.min_amount} and ${bill.max_amount}` }]
        ),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    // Verify payment method if provided
    if (body.paymentMethodId || body.payment_method_id) {
      const pm = await env.DB.prepare('SELECT id, type FROM payment_methods WHERE id = ?')
        .bind(body.paymentMethodId || body.payment_method_id)
        .first();
      if (!pm) {
        return jsonResponse(
          errorResponse('NOT_FOUND', 'Payment method not found', requestId),
          404,
          { 'X-Request-Id': requestId }
        );
      }
    }

    const id = body.id || `pay-${generateId().slice(0, 8)}`;
    const transactionId = generateTransactionId();
    const referenceNumber = generateReferenceNumber();
    const now = getCurrentTimestamp();
    const convenienceFee = calculateConvenienceFee(amount, body.paymentMethodType || body.payment_method_type);
    const totalAmount = amount + convenienceFee;

    // Simulate payment processing - randomly succeed/fail for demo
    const simulatedStatus = Math.random() > 0.1 ? 'completed' : 'failed';
    const processedAt = simulatedStatus === 'completed' ? now : null;

    await env.DB.prepare(
      `INSERT INTO payments (
        id, bill_id, user_id, amount, currency, convenience_fee, total_amount,
        payment_method_id, payment_method_type, payment_method_details,
        status, transaction_id, reference_number, biller_reference,
        failure_reason, failure_code, processed_at,
        ip_address, user_agent, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.billId || body.bill_id,
        bill.user_id,
        amount,
        body.currency || 'INR',
        convenienceFee,
        totalAmount,
        body.paymentMethodId || body.payment_method_id || null,
        body.paymentMethodType || body.payment_method_type || 'upi',
        body.paymentMethodDetails ? JSON.stringify(body.paymentMethodDetails) : null,
        simulatedStatus,
        transactionId,
        referenceNumber,
        `BLR${generateId().slice(0, 10).toUpperCase()}`,
        simulatedStatus === 'failed' ? 'Payment declined by bank' : null,
        simulatedStatus === 'failed' ? 'BANK_DECLINED' : null,
        processedAt,
        ctx?.clientIp || null,
        request.headers.get('User-Agent'),
        now,
        now,
        ctx?.auth?.identifier || 'api'
      )
      .run();

    // Update bill status if payment completed
    if (simulatedStatus === 'completed') {
      const newBillStatus = totalAmount >= bill.amount ? 'paid' : 'partially_paid';
      await env.DB.prepare('UPDATE bills SET status = ?, updated_at = ? WHERE id = ?')
        .bind(newBillStatus, now, bill.id)
        .run();

      // Create transaction record
      await env.DB.prepare(
        `INSERT INTO transactions (id, payment_id, user_id, type, amount, status, description, created_at, created_by)
         VALUES (?, ?, ?, 'payment', ?, 'completed', ?, ?, ?)`
      )
        .bind(
          `txn-${generateId().slice(0, 8)}`,
          id,
          bill.user_id,
          totalAmount,
          `Payment for ${bill.biller_name} - ${bill.nickname || bill.customer_identifier}`,
          now,
          ctx?.auth?.identifier || 'api'
        )
        .run();
    }

    const created = await env.DB.prepare(
      `SELECT p.*, b.customer_identifier, b.nickname as bill_nickname, 
              bl.display_name as biller_name
       FROM payments p
       LEFT JOIN bills b ON p.bill_id = b.id
       LEFT JOIN billers bl ON b.biller_id = bl.id
       WHERE p.id = ?`
    )
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(formatPayment(created), { requestId, version: env.API_VERSION }),
      201,
      { 'X-Request-Id': requestId, Location: `/v1/payments/${id}` }
    );
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to process payment', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/payments/:id/refund - Refund payment
// ============================================
paymentsRouter.post('/:id/refund', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Payment ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const payment = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first<any>();

    if (!payment) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Payment with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    if (payment.status !== 'completed') {
      return jsonResponse(
        errorResponse('INVALID_STATE', 'Only completed payments can be refunded', requestId),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const body = await request.json().catch(() => ({}));
    const refundAmount = body.amount || payment.total_amount;
    const reason = body.reason || 'Customer requested refund';
    const now = getCurrentTimestamp();

    // Update payment status
    await env.DB.prepare(
      `UPDATE payments SET status = 'refunded', updated_at = ? WHERE id = ?`
    )
      .bind(now, id)
      .run();

    // Update bill status back to pending
    await env.DB.prepare(
      `UPDATE bills SET status = 'pending', updated_at = ? WHERE id = ?`
    )
      .bind(now, payment.bill_id)
      .run();

    // Create refund transaction
    await env.DB.prepare(
      `INSERT INTO transactions (id, payment_id, user_id, type, amount, status, description, created_at, created_by)
       VALUES (?, ?, ?, 'refund', ?, 'completed', ?, ?, ?)`
    )
      .bind(
        `txn-${generateId().slice(0, 8)}`,
        id,
        payment.user_id,
        -refundAmount,
        `Refund: ${reason}`,
        now,
        ctx?.auth?.identifier || 'api'
      )
      .run();

    const updated = await env.DB.prepare(
      `SELECT p.*, b.customer_identifier, bl.display_name as biller_name
       FROM payments p
       LEFT JOIN bills b ON p.bill_id = b.id
       LEFT JOIN billers bl ON b.biller_id = bl.id
       WHERE p.id = ?`
    )
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(
        {
          ...formatPayment(updated),
          refund: {
            amount: refundAmount,
            reason,
            processedAt: now,
          },
        },
        { requestId, version: env.API_VERSION }
      ),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error processing refund:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to process refund', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/payments/:id/cancel - Cancel payment
// ============================================
paymentsRouter.post('/:id/cancel', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Payment ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const payment = await env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first<any>();

    if (!payment) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Payment with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    if (!['initiated', 'processing'].includes(payment.status)) {
      return jsonResponse(
        errorResponse('INVALID_STATE', 'Only initiated or processing payments can be cancelled', requestId),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const now = getCurrentTimestamp();

    await env.DB.prepare(
      `UPDATE payments SET status = 'cancelled', updated_at = ? WHERE id = ?`
    )
      .bind(now, id)
      .run();

    const updated = await env.DB.prepare(
      `SELECT p.*, b.customer_identifier, bl.display_name as biller_name
       FROM payments p
       LEFT JOIN bills b ON p.bill_id = b.id
       LEFT JOIN billers bl ON b.biller_id = bl.id
       WHERE p.id = ?`
    )
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(formatPayment(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to cancel payment', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// DELETE /v1/payments/:id - Delete payment
// ============================================
paymentsRouter.delete('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Payment ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT id, status FROM payments WHERE id = ?').bind(id).first<any>();

    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Payment with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    if (existing.status === 'completed') {
      return jsonResponse(
        errorResponse('INVALID_STATE', 'Completed payments cannot be deleted. Use refund instead.', requestId),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    // Delete related transactions
    await env.DB.prepare('DELETE FROM transactions WHERE payment_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM payments WHERE id = ?').bind(id).run();

    return jsonResponse(
      successResponse({ deleted: true, id }, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error deleting payment:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to delete payment', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// Helper Functions
// ============================================

function formatPayment(row: any): any {
  if (!row) return {};

  let paymentMethodDetails = row.payment_method_details;
  if (typeof paymentMethodDetails === 'string') {
    try {
      paymentMethodDetails = JSON.parse(paymentMethodDetails);
    } catch {
      paymentMethodDetails = null;
    }
  }

  return {
    id: row.id,
    billId: row.bill_id,
    userId: row.user_id,
    billerName: row.biller_name,
    billNickname: row.bill_nickname,
    customerIdentifier: row.customer_identifier,
    amount: {
      value: row.amount,
      currency: row.currency || 'INR',
    },
    convenienceFee: row.convenience_fee,
    totalAmount: {
      value: row.total_amount,
      currency: row.currency || 'INR',
    },
    paymentMethod: {
      id: row.payment_method_id,
      type: row.payment_method_type,
      details: paymentMethodDetails,
    },
    status: row.status,
    transactionId: row.transaction_id,
    referenceNumber: row.reference_number,
    billerReference: row.biller_reference,
    failure: row.failure_reason
      ? {
          reason: row.failure_reason,
          code: row.failure_code,
        }
      : undefined,
    processedAt: row.processed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function calculateConvenienceFee(amount: number, paymentType: string): number {
  // Demo convenience fees
  if (paymentType === 'credit_card') {
    return Math.round(amount * 0.015 * 100) / 100; // 1.5%
  }
  if (paymentType === 'debit_card') {
    return Math.round(amount * 0.005 * 100) / 100; // 0.5%
  }
  return 0; // UPI, Net Banking, Wallet - no fee
}

function validatePaymentInput(body: any): { field: string; code: string; message: string }[] {
  const errors: { field: string; code: string; message: string }[] = [];

  if (!body.billId && !body.bill_id) {
    errors.push({ field: 'billId', code: 'REQUIRED', message: 'billId is required' });
  }

  if (body.amount === undefined) {
    errors.push({ field: 'amount', code: 'REQUIRED', message: 'amount is required' });
  } else if (typeof body.amount !== 'number' || body.amount <= 0) {
    errors.push({ field: 'amount', code: 'INVALID_VALUE', message: 'amount must be a positive number' });
  }

  const validTypes = ['upi', 'credit_card', 'debit_card', 'net_banking', 'wallet'];
  const pmType = body.paymentMethodType || body.payment_method_type;
  if (pmType && !validTypes.includes(pmType)) {
    errors.push({
      field: 'paymentMethodType',
      code: 'INVALID_VALUE',
      message: `paymentMethodType must be one of: ${validTypes.join(', ')}`,
    });
  }

  return errors;
}
