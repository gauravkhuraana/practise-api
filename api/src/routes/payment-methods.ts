// Payment Methods Routes

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
  getCurrentTimestamp,
} from '../utils';

export const paymentMethodsRouter = Router({ base: '/v1/payment-methods' });

type PaymentMethodType = 'upi' | 'credit_card' | 'debit_card' | 'net_banking' | 'wallet';

// ============================================
// GET /v1/payment-methods - List payment methods
// ============================================
paymentMethodsRouter.get('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const { page, limit, offset } = parsePaginationParams(url);

  const userId = url.searchParams.get('user_id');
  const type = url.searchParams.get('type') as PaymentMethodType | null;
  const isActive = url.searchParams.get('is_active');
  const createdBy = url.searchParams.get('created_by');

  try {
    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (isActive !== null) {
      whereClause += ' AND is_active = ?';
      params.push(isActive === 'true' || isActive === '1' ? 1 : 0);
    }

    if (createdBy) {
      whereClause += ' AND created_by = ?';
      params.push(createdBy);
    }

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM payment_methods ${whereClause}`
    )
      .bind(...params)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    const methods = await env.DB.prepare(
      `SELECT * FROM payment_methods ${whereClause} 
       ORDER BY is_default DESC, created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, limit, offset)
      .all();

    const data = (methods.results || []).map((row) => formatPaymentMethod(row));
    const pagination = calculatePagination(page, limit, total);

    return jsonResponse(
      paginatedResponse(data, pagination, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch payment methods', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/payment-methods/types - List supported types
// ============================================
paymentMethodsRouter.get('/types', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  const types = [
    { type: 'upi', displayName: 'UPI', description: 'Unified Payments Interface', convenienceFee: 0 },
    { type: 'credit_card', displayName: 'Credit Card', description: 'Visa, Mastercard, Amex, RuPay', convenienceFee: 1.5 },
    { type: 'debit_card', displayName: 'Debit Card', description: 'Visa, Mastercard, RuPay Debit Cards', convenienceFee: 0.5 },
    { type: 'net_banking', displayName: 'Net Banking', description: 'Direct bank transfer', convenienceFee: 0 },
    { type: 'wallet', displayName: 'Wallet', description: 'Paytm, PhonePe, Amazon Pay', convenienceFee: 0 },
  ];

  return jsonResponse(
    successResponse(types, { requestId, version: env.API_VERSION }),
    200,
    { 'X-Request-Id': requestId }
  );
});

// ============================================
// GET /v1/payment-methods/:id - Get by ID
// ============================================
paymentMethodsRouter.get('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Payment method ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const method = await env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?')
      .bind(id)
      .first();

    if (!method) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Payment method with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    return jsonResponse(
      successResponse(formatPaymentMethod(method), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching payment method:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch payment method', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/payment-methods - Create payment method
// ============================================
paymentMethodsRouter.post('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  try {
    const body = await request.json();
    const errors = validatePaymentMethodInput(body, true);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid payment method data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    // Verify user exists
    const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?')
      .bind(body.userId || body.user_id)
      .first();
    if (!user) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `User with ID '${body.userId || body.user_id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const id = body.id || `pm-${body.type}-${generateId().slice(0, 6)}`;
    const now = getCurrentTimestamp();
    const type = body.type;

    // If this is set as default, unset other defaults
    if (body.isDefault || body.is_default) {
      await env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?')
        .bind(body.userId || body.user_id)
        .run();
    }

    await env.DB.prepare(
      `INSERT INTO payment_methods (
        id, user_id, type, display_name, is_default,
        upi_id, card_last_four, card_network, card_expiry_month, card_expiry_year, card_holder_name,
        bank_name, bank_account_last_four, wallet_provider, wallet_id,
        is_active, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.userId || body.user_id,
        type,
        body.displayName || body.display_name,
        body.isDefault ?? body.is_default ?? 0,
        type === 'upi' ? (body.upiId || body.upi_id) : null,
        ['credit_card', 'debit_card'].includes(type) ? (body.cardLastFour || body.card_last_four) : null,
        ['credit_card', 'debit_card'].includes(type) ? (body.cardNetwork || body.card_network || 'visa') : null,
        ['credit_card', 'debit_card'].includes(type) ? (body.cardExpiryMonth || body.card_expiry_month) : null,
        ['credit_card', 'debit_card'].includes(type) ? (body.cardExpiryYear || body.card_expiry_year) : null,
        ['credit_card', 'debit_card'].includes(type) ? (body.cardHolderName || body.card_holder_name) : null,
        type === 'net_banking' ? (body.bankName || body.bank_name) : null,
        type === 'net_banking' ? (body.bankAccountLastFour || body.bank_account_last_four) : null,
        type === 'wallet' ? (body.walletProvider || body.wallet_provider) : null,
        type === 'wallet' ? (body.walletId || body.wallet_id) : null,
        body.isActive ?? body.is_active ?? 1,
        now,
        now,
        ctx?.auth?.identifier || 'api'
      )
      .run();

    const created = await env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?')
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(formatPaymentMethod(created), { requestId, version: env.API_VERSION }),
      201,
      { 'X-Request-Id': requestId, Location: `/v1/payment-methods/${id}` }
    );
  } catch (error: any) {
    console.error('Error creating payment method:', error);
    if (error?.message?.includes('UNIQUE constraint')) {
      return jsonResponse(
        errorResponse('CONFLICT', 'A payment method with this ID already exists', requestId),
        409,
        { 'X-Request-Id': requestId }
      );
    }
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to create payment method', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// PUT /v1/payment-methods/:id - Full update
// ============================================
paymentMethodsRouter.put('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Payment method ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Payment method with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const body = await request.json();
    const errors = validatePaymentMethodInput(body, true);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid payment method data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const now = getCurrentTimestamp();
    const type = body.type;

    // Handle default flag
    if (body.isDefault || body.is_default) {
      await env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ? AND id != ?')
        .bind(existing.user_id, id)
        .run();
    }

    await env.DB.prepare(
      `UPDATE payment_methods SET
        type = ?, display_name = ?, is_default = ?,
        upi_id = ?, card_last_four = ?, card_network = ?, card_expiry_month = ?, card_expiry_year = ?, card_holder_name = ?,
        bank_name = ?, bank_account_last_four = ?, wallet_provider = ?, wallet_id = ?,
        is_active = ?, updated_at = ?
      WHERE id = ?`
    )
      .bind(
        type,
        body.displayName || body.display_name,
        body.isDefault ?? body.is_default ?? 0,
        type === 'upi' ? (body.upiId || body.upi_id) : null,
        ['credit_card', 'debit_card'].includes(type) ? (body.cardLastFour || body.card_last_four) : null,
        ['credit_card', 'debit_card'].includes(type) ? (body.cardNetwork || body.card_network) : null,
        ['credit_card', 'debit_card'].includes(type) ? (body.cardExpiryMonth || body.card_expiry_month) : null,
        ['credit_card', 'debit_card'].includes(type) ? (body.cardExpiryYear || body.card_expiry_year) : null,
        ['credit_card', 'debit_card'].includes(type) ? (body.cardHolderName || body.card_holder_name) : null,
        type === 'net_banking' ? (body.bankName || body.bank_name) : null,
        type === 'net_banking' ? (body.bankAccountLastFour || body.bank_account_last_four) : null,
        type === 'wallet' ? (body.walletProvider || body.wallet_provider) : null,
        type === 'wallet' ? (body.walletId || body.wallet_id) : null,
        body.isActive ?? body.is_active ?? 1,
        now,
        id
      )
      .run();

    const updated = await env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?')
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(formatPaymentMethod(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error updating payment method:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to update payment method', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// PATCH /v1/payment-methods/:id - Partial update
// ============================================
paymentMethodsRouter.patch('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Payment method ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Payment method with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      displayName: 'display_name',
      display_name: 'display_name',
      isDefault: 'is_default',
      is_default: 'is_default',
      isActive: 'is_active',
      is_active: 'is_active',
      upiId: 'upi_id',
      upi_id: 'upi_id',
      cardLastFour: 'card_last_four',
      card_last_four: 'card_last_four',
      cardNetwork: 'card_network',
      card_network: 'card_network',
      cardExpiryMonth: 'card_expiry_month',
      card_expiry_month: 'card_expiry_month',
      cardExpiryYear: 'card_expiry_year',
      card_expiry_year: 'card_expiry_year',
      cardHolderName: 'card_holder_name',
      card_holder_name: 'card_holder_name',
      bankName: 'bank_name',
      bank_name: 'bank_name',
      walletProvider: 'wallet_provider',
      wallet_provider: 'wallet_provider',
    };

    // Handle default flag specially
    if ((body.isDefault || body.is_default) && existing.user_id) {
      await env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ? AND id != ?')
        .bind(existing.user_id, id)
        .run();
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (body[key] !== undefined && !updates.some((u) => u.startsWith(`${dbField} =`))) {
        updates.push(`${dbField} = ?`);
        values.push(body[key]);
      }
    }

    if (updates.length === 0) {
      return jsonResponse(
        errorResponse('INVALID_REQUEST', 'No valid fields to update', requestId),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    updates.push('updated_at = ?');
    values.push(getCurrentTimestamp());
    values.push(id);

    await env.DB.prepare(`UPDATE payment_methods SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?')
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(formatPaymentMethod(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error patching payment method:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to update payment method', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// DELETE /v1/payment-methods/:id - Delete
// ============================================
paymentMethodsRouter.delete('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Payment method ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT id FROM payment_methods WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Payment method with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    // Check for related payments
    const relatedPayments = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM payments WHERE payment_method_id = ?`
    )
      .bind(id)
      .first<{ count: number }>();

    if (relatedPayments && relatedPayments.count > 0) {
      return jsonResponse(
        errorResponse(
          'CONFLICT',
          `Cannot delete. ${relatedPayments.count} payment(s) use this payment method.`,
          requestId
        ),
        409,
        { 'X-Request-Id': requestId }
      );
    }

    await env.DB.prepare('DELETE FROM payment_methods WHERE id = ?').bind(id).run();

    return jsonResponse(
      successResponse({ deleted: true, id }, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to delete payment method', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/payment-methods/:id/set-default
// ============================================
paymentMethodsRouter.post('/:id/set-default', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Payment method ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const method = await env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?')
      .bind(id)
      .first<any>();

    if (!method) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Payment method with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const now = getCurrentTimestamp();

    // Unset other defaults for this user
    await env.DB.prepare('UPDATE payment_methods SET is_default = 0, updated_at = ? WHERE user_id = ?')
      .bind(now, method.user_id)
      .run();

    // Set this one as default
    await env.DB.prepare('UPDATE payment_methods SET is_default = 1, updated_at = ? WHERE id = ?')
      .bind(now, id)
      .run();

    const updated = await env.DB.prepare('SELECT * FROM payment_methods WHERE id = ?')
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(formatPaymentMethod(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error setting default:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to set default payment method', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// Helper Functions
// ============================================

function formatPaymentMethod(row: any): any {
  if (!row) return {};

  const base = {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    displayName: row.display_name,
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Add type-specific details
  if (row.type === 'upi') {
    return { ...base, upiId: row.upi_id };
  }

  if (row.type === 'credit_card' || row.type === 'debit_card') {
    return {
      ...base,
      card: {
        lastFour: row.card_last_four,
        network: row.card_network,
        expiryMonth: row.card_expiry_month,
        expiryYear: row.card_expiry_year,
        holderName: row.card_holder_name,
      },
    };
  }

  if (row.type === 'net_banking') {
    return {
      ...base,
      bank: {
        name: row.bank_name,
        accountLastFour: row.bank_account_last_four,
      },
    };
  }

  if (row.type === 'wallet') {
    return {
      ...base,
      wallet: {
        provider: row.wallet_provider,
        walletId: row.wallet_id,
      },
    };
  }

  return base;
}

function validatePaymentMethodInput(
  body: any,
  requireAll: boolean
): { field: string; code: string; message: string }[] {
  const errors: { field: string; code: string; message: string }[] = [];
  const validTypes = ['upi', 'credit_card', 'debit_card', 'net_banking', 'wallet'];

  if (requireAll) {
    if (!body.userId && !body.user_id) {
      errors.push({ field: 'userId', code: 'REQUIRED', message: 'userId is required' });
    }
    if (!body.type) {
      errors.push({ field: 'type', code: 'REQUIRED', message: 'type is required' });
    }
    if (!body.displayName && !body.display_name) {
      errors.push({ field: 'displayName', code: 'REQUIRED', message: 'displayName is required' });
    }
  }

  if (body.type && !validTypes.includes(body.type)) {
    errors.push({
      field: 'type',
      code: 'INVALID_VALUE',
      message: `type must be one of: ${validTypes.join(', ')}`,
    });
  }

  // Type-specific validation
  if (body.type === 'upi' && requireAll) {
    if (!body.upiId && !body.upi_id) {
      errors.push({ field: 'upiId', code: 'REQUIRED', message: 'upiId is required for UPI type' });
    }
  }

  if (['credit_card', 'debit_card'].includes(body.type) && requireAll) {
    if (!body.cardLastFour && !body.card_last_four) {
      errors.push({ field: 'cardLastFour', code: 'REQUIRED', message: 'cardLastFour is required for card types' });
    }
  }

  const cardLastFour = body.cardLastFour || body.card_last_four;
  if (cardLastFour && !/^\d{4}$/.test(cardLastFour)) {
    errors.push({ field: 'cardLastFour', code: 'INVALID_FORMAT', message: 'cardLastFour must be 4 digits' });
  }

  const validNetworks = ['visa', 'mastercard', 'amex', 'rupay', 'discover'];
  const network = body.cardNetwork || body.card_network;
  if (network && !validNetworks.includes(network)) {
    errors.push({
      field: 'cardNetwork',
      code: 'INVALID_VALUE',
      message: `cardNetwork must be one of: ${validNetworks.join(', ')}`,
    });
  }

  return errors;
}
