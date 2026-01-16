// Bills Routes - Bill Management

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext, Bill, BillStatus } from '../types';
import {
  jsonResponse,
  errorResponse,
  forbiddenResponse,
  successResponse,
  paginatedResponse,
  calculatePagination,
  parsePaginationParams,
  generateId,
  getCurrentTimestamp,
} from '../utils';

export const billsRouter = Router({ base: '/v1/bills' });

// ============================================
// GET /v1/bills - List bills with filters
// ============================================
billsRouter.get('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const { page, limit, offset, mode } = parsePaginationParams(url);

  // Filter parameters
  const userId = url.searchParams.get('user_id');
  const billerId = url.searchParams.get('biller_id');
  const status = url.searchParams.get('status') as BillStatus | null;
  const createdBy = url.searchParams.get('created_by');
  const dueBefore = url.searchParams.get('due_before');
  const dueAfter = url.searchParams.get('due_after');

  try {
    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (userId) {
      whereClause += ' AND b.user_id = ?';
      params.push(userId);
    }

    if (billerId) {
      whereClause += ' AND b.biller_id = ?';
      params.push(billerId);
    }

    if (status) {
      whereClause += ' AND b.status = ?';
      params.push(status);
    }

    if (createdBy) {
      whereClause += ' AND b.created_by = ?';
      params.push(createdBy);
    }

    if (dueBefore) {
      whereClause += ' AND b.due_date <= ?';
      params.push(dueBefore);
    }

    if (dueAfter) {
      whereClause += ' AND b.due_date >= ?';
      params.push(dueAfter);
    }

    // Get total count
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM bills b ${whereClause}`
    )
      .bind(...params)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    // Get paginated results with biller info
    const bills = await env.DB.prepare(
      `SELECT b.*, bl.display_name as biller_name, bl.category as biller_category
       FROM bills b
       LEFT JOIN billers bl ON b.biller_id = bl.id
       ${whereClause}
       ORDER BY b.due_date ASC, b.created_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, limit, offset)
      .all();

    const data = (bills.results || []).map((row) => formatBill(row));
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
    console.error('Error fetching bills:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch bills', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/bills/summary - Get bills summary
// ============================================
billsRouter.get('/summary', async (request: IRequest, env: Env, ctx?: RequestContext) => {
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
         SUM(amount) as total_amount 
       FROM bills ${whereClause}
       GROUP BY status`
    )
      .bind(...params)
      .all();

    const summary: Record<string, { count: number; totalAmount: number }> = {};
    let grandTotal = 0;
    let grandCount = 0;

    for (const row of result.results || []) {
      const r = row as any;
      summary[r.status] = {
        count: r.count,
        totalAmount: r.total_amount || 0,
      };
      grandTotal += r.total_amount || 0;
      grandCount += r.count;
    }

    return jsonResponse(
      successResponse(
        {
          byStatus: summary,
          total: { count: grandCount, totalAmount: grandTotal },
        },
        { requestId, version: env.API_VERSION }
      ),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching summary:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch summary', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/bills/overdue - Get overdue bills
// ============================================
billsRouter.get('/overdue', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const { page, limit, offset, mode } = parsePaginationParams(url);
  const userId = url.searchParams.get('user_id');

  try {
    const today = new Date().toISOString().split('T')[0];
    let whereClause = `WHERE b.due_date < ? AND b.status IN ('pending', 'overdue')`;
    const params: unknown[] = [today];

    if (userId) {
      whereClause += ' AND b.user_id = ?';
      params.push(userId);
    }

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM bills b ${whereClause}`
    )
      .bind(...params)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    const bills = await env.DB.prepare(
      `SELECT b.*, bl.display_name as biller_name
       FROM bills b
       LEFT JOIN billers bl ON b.biller_id = bl.id
       ${whereClause}
       ORDER BY b.due_date ASC
       LIMIT ? OFFSET ?`
    )
      .bind(...params, limit, offset)
      .all();

    const data = (bills.results || []).map((row) => formatBill(row));
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
    console.error('Error fetching overdue bills:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch overdue bills', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/bills/:id - Get bill by ID
// ============================================
billsRouter.get('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Bill ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  // 403 Forbidden: Block access to restricted bills (for testing 403 responses)
  if (id.includes('restricted')) {
    return forbiddenResponse(
      requestId,
      'Access to restricted bills is not allowed.',
      [{ field: 'id', code: 'RESTRICTED_RESOURCE', message: 'This bill is marked as restricted' }]
    );
  }

  try {
    const bill = await env.DB.prepare(
      `SELECT b.*, bl.display_name as biller_name, bl.category as biller_category
       FROM bills b
       LEFT JOIN billers bl ON b.biller_id = bl.id
       WHERE b.id = ?`
    )
      .bind(id)
      .first();

    if (!bill) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Bill with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    return jsonResponse(
      successResponse(formatBill(bill), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching bill:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch bill', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/bills - Create a new bill
// ============================================
billsRouter.post('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  try {
    const body = await request.json();
    const errors = validateBillInput(body, true);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid bill data', requestId, errors),
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

    // Verify biller exists
    const biller = await env.DB.prepare('SELECT id, display_name FROM billers WHERE id = ?')
      .bind(body.billerId || body.biller_id)
      .first();
    if (!biller) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Biller with ID '${body.billerId || body.biller_id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const id = body.id || `bill-${generateId().slice(0, 8)}`;
    const now = getCurrentTimestamp();

    await env.DB.prepare(
      `INSERT INTO bills (
        id, user_id, biller_id, customer_identifier, customer_name, nickname,
        amount, currency, due_date, bill_date, bill_period, status,
        bill_details, auto_pay_enabled, auto_pay_method_id, auto_pay_max_amount,
        auto_pay_days_before, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.userId || body.user_id,
        body.billerId || body.biller_id,
        body.customerIdentifier || body.customer_identifier,
        body.customerName || body.customer_name || null,
        body.nickname || null,
        body.amount,
        body.currency || 'INR',
        body.dueDate || body.due_date || null,
        body.billDate || body.bill_date || null,
        body.billPeriod || body.bill_period || null,
        body.status || 'pending',
        body.billDetails ? JSON.stringify(body.billDetails) : null,
        body.autoPayEnabled ?? body.auto_pay_enabled ?? 0,
        body.autoPayMethodId || body.auto_pay_method_id || null,
        body.autoPayMaxAmount || body.auto_pay_max_amount || null,
        body.autoPayDaysBefore || body.auto_pay_days_before || 3,
        now,
        now,
        ctx?.auth?.identifier || 'api'
      )
      .run();

    const created = await env.DB.prepare(
      `SELECT b.*, bl.display_name as biller_name 
       FROM bills b 
       LEFT JOIN billers bl ON b.biller_id = bl.id 
       WHERE b.id = ?`
    )
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(formatBill(created), { requestId, version: env.API_VERSION }),
      201,
      { 'X-Request-Id': requestId, Location: `/v1/bills/${id}` }
    );
  } catch (error: any) {
    console.error('Error creating bill:', error);
    if (error?.message?.includes('UNIQUE constraint')) {
      return jsonResponse(
        errorResponse('CONFLICT', 'A bill with this ID already exists', requestId),
        409,
        { 'X-Request-Id': requestId }
      );
    }
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to create bill', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// PUT /v1/bills/:id - Update bill (full replace)
// ============================================
billsRouter.put('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Bill ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT id FROM bills WHERE id = ?').bind(id).first();
    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Bill with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const body = await request.json();
    const errors = validateBillInput(body, true);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid bill data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const now = getCurrentTimestamp();

    await env.DB.prepare(
      `UPDATE bills SET
        user_id = ?, biller_id = ?, customer_identifier = ?, customer_name = ?,
        nickname = ?, amount = ?, currency = ?, due_date = ?, bill_date = ?,
        bill_period = ?, status = ?, bill_details = ?, auto_pay_enabled = ?,
        auto_pay_method_id = ?, auto_pay_max_amount = ?, auto_pay_days_before = ?,
        updated_at = ?
      WHERE id = ?`
    )
      .bind(
        body.userId || body.user_id,
        body.billerId || body.biller_id,
        body.customerIdentifier || body.customer_identifier,
        body.customerName || body.customer_name || null,
        body.nickname || null,
        body.amount,
        body.currency || 'INR',
        body.dueDate || body.due_date || null,
        body.billDate || body.bill_date || null,
        body.billPeriod || body.bill_period || null,
        body.status || 'pending',
        body.billDetails ? JSON.stringify(body.billDetails) : null,
        body.autoPayEnabled ?? body.auto_pay_enabled ?? 0,
        body.autoPayMethodId || body.auto_pay_method_id || null,
        body.autoPayMaxAmount || body.auto_pay_max_amount || null,
        body.autoPayDaysBefore || body.auto_pay_days_before || 3,
        now,
        id
      )
      .run();

    const updated = await env.DB.prepare(
      `SELECT b.*, bl.display_name as biller_name 
       FROM bills b 
       LEFT JOIN billers bl ON b.biller_id = bl.id 
       WHERE b.id = ?`
    )
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(formatBill(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error updating bill:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to update bill', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// PATCH /v1/bills/:id - Partial update
// ============================================
billsRouter.patch('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Bill ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT * FROM bills WHERE id = ?').bind(id).first();
    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Bill with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const body = await request.json();
    const errors = validateBillInput(body, false);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid bill data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      userId: 'user_id',
      user_id: 'user_id',
      billerId: 'biller_id',
      biller_id: 'biller_id',
      customerIdentifier: 'customer_identifier',
      customer_identifier: 'customer_identifier',
      customerName: 'customer_name',
      customer_name: 'customer_name',
      nickname: 'nickname',
      amount: 'amount',
      currency: 'currency',
      dueDate: 'due_date',
      due_date: 'due_date',
      billDate: 'bill_date',
      bill_date: 'bill_date',
      billPeriod: 'bill_period',
      bill_period: 'bill_period',
      status: 'status',
      autoPayEnabled: 'auto_pay_enabled',
      auto_pay_enabled: 'auto_pay_enabled',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        if (!updates.some((u) => u.startsWith(`${dbField} =`))) {
          updates.push(`${dbField} = ?`);
          values.push(body[key]);
        }
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

    await env.DB.prepare(`UPDATE bills SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await env.DB.prepare(
      `SELECT b.*, bl.display_name as biller_name 
       FROM bills b 
       LEFT JOIN billers bl ON b.biller_id = bl.id 
       WHERE b.id = ?`
    )
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(formatBill(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error patching bill:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to update bill', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// DELETE /v1/bills/:id - Delete bill
// ============================================
billsRouter.delete('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Bill ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT id FROM bills WHERE id = ?').bind(id).first();
    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Bill with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    // Check for related payments
    const relatedPayments = await env.DB.prepare('SELECT COUNT(*) as count FROM payments WHERE bill_id = ?')
      .bind(id)
      .first<{ count: number }>();

    if (relatedPayments && relatedPayments.count > 0) {
      return jsonResponse(
        errorResponse(
          'CONFLICT',
          `Cannot delete bill. ${relatedPayments.count} payment(s) are associated with this bill.`,
          requestId
        ),
        409,
        { 'X-Request-Id': requestId }
      );
    }

    await env.DB.prepare('DELETE FROM bills WHERE id = ?').bind(id).run();

    return jsonResponse(
      successResponse({ deleted: true, id }, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error deleting bill:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to delete bill', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/bills/:id/fetch - Fetch latest bill from biller
// ============================================
billsRouter.post('/:id/fetch', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Bill ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const bill = await env.DB.prepare(
      `SELECT b.*, bl.fetch_bill_supported, bl.display_name as biller_name
       FROM bills b
       JOIN billers bl ON b.biller_id = bl.id
       WHERE b.id = ?`
    )
      .bind(id)
      .first<any>();

    if (!bill) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Bill with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    if (!bill.fetch_bill_supported) {
      return jsonResponse(
        errorResponse('NOT_SUPPORTED', 'This biller does not support bill fetching', requestId),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    // Simulate bill fetch - generate random amount for demo
    const newAmount = Math.floor(Math.random() * 5000) + 100;
    const now = getCurrentTimestamp();
    const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await env.DB.prepare(
      `UPDATE bills SET amount = ?, due_date = ?, status = 'pending', updated_at = ? WHERE id = ?`
    )
      .bind(newAmount, dueDate, now, id)
      .run();

    const updated = await env.DB.prepare(
      `SELECT b.*, bl.display_name as biller_name 
       FROM bills b 
       LEFT JOIN billers bl ON b.biller_id = bl.id 
       WHERE b.id = ?`
    )
      .bind(id)
      .first();

    return jsonResponse(
      successResponse(
        {
          ...formatBill(updated),
          fetchedAt: now,
          message: 'Bill details fetched successfully from biller',
        },
        { requestId, version: env.API_VERSION }
      ),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching bill:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch bill details', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// Helper Functions
// ============================================

function formatBill(row: any): Partial<Bill> & { billerName?: string; billerCategory?: string } {
  if (!row) return {};

  let billDetails = row.bill_details;
  if (typeof billDetails === 'string') {
    try {
      billDetails = JSON.parse(billDetails);
    } catch {
      billDetails = null;
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    billerId: row.biller_id,
    billerName: row.biller_name,
    billerCategory: row.biller_category,
    customerIdentifier: row.customer_identifier,
    customerName: row.customer_name,
    nickname: row.nickname,
    amount: {
      value: row.amount,
      currency: row.currency || 'INR',
    },
    dueDate: row.due_date,
    billDate: row.bill_date,
    billPeriod: row.bill_period,
    status: row.status,
    billDetails,
    autoPay: row.auto_pay_enabled
      ? {
          enabled: true,
          paymentMethodId: row.auto_pay_method_id,
          maxAmount: row.auto_pay_max_amount,
          daysBefore: row.auto_pay_days_before,
        }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateBillInput(body: any, requireAll: boolean): { field: string; code: string; message: string }[] {
  const errors: { field: string; code: string; message: string }[] = [];
  const validStatuses = ['pending', 'paid', 'overdue', 'partially_paid', 'cancelled'];

  if (requireAll) {
    if (!body.userId && !body.user_id) {
      errors.push({ field: 'userId', code: 'REQUIRED', message: 'userId is required' });
    }
    if (!body.billerId && !body.biller_id) {
      errors.push({ field: 'billerId', code: 'REQUIRED', message: 'billerId is required' });
    }
    if (!body.customerIdentifier && !body.customer_identifier) {
      errors.push({ field: 'customerIdentifier', code: 'REQUIRED', message: 'customerIdentifier is required' });
    }
    if (body.amount === undefined) {
      errors.push({ field: 'amount', code: 'REQUIRED', message: 'amount is required' });
    }
  }

  if (body.amount !== undefined && (typeof body.amount !== 'number' || body.amount <= 0)) {
    errors.push({ field: 'amount', code: 'INVALID_VALUE', message: 'amount must be a positive number' });
  }

  if (body.status && !validStatuses.includes(body.status)) {
    errors.push({
      field: 'status',
      code: 'INVALID_VALUE',
      message: `status must be one of: ${validStatuses.join(', ')}`,
    });
  }

  if (body.dueDate || body.due_date) {
    const dateStr = body.dueDate || body.due_date;
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      errors.push({ field: 'dueDate', code: 'INVALID_FORMAT', message: 'dueDate must be in YYYY-MM-DD format' });
    }
  }

  return errors;
}
