// Billers Routes - Service Provider Management

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext, Biller, BillerCategory } from '../types';
import {
  jsonResponse,
  errorResponse,
  successResponse,
  paginatedResponse,
  calculatePagination,
  parsePaginationParams,
  toCamelCase,
  generateId,
  getCurrentTimestamp,
} from '../utils';

export const billersRouter = Router({ base: '/v1/billers' });

// ============================================
// GET /v1/billers - List all billers
// ============================================
billersRouter.get('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const { page, limit, offset, mode } = parsePaginationParams(url);

  // Filter parameters
  const category = url.searchParams.get('category') as BillerCategory | null;
  const isActive = url.searchParams.get('is_active');
  const search = url.searchParams.get('search');
  const fetchBillSupported = url.searchParams.get('fetch_bill_supported');

  try {
    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (isActive !== null) {
      whereClause += ' AND is_active = ?';
      params.push(isActive === 'true' || isActive === '1' ? 1 : 0);
    }

    if (fetchBillSupported !== null) {
      whereClause += ' AND fetch_bill_supported = ?';
      params.push(fetchBillSupported === 'true' || fetchBillSupported === '1' ? 1 : 0);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get total count
    const countResult = await env.DB.prepare(`SELECT COUNT(*) as count FROM billers ${whereClause}`)
      .bind(...params)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    // Get paginated results
    const billers = await env.DB.prepare(
      `SELECT * FROM billers ${whereClause} ORDER BY category, display_name LIMIT ? OFFSET ?`
    )
      .bind(...params, limit, offset)
      .all();

    const data = (billers.results || []).map((row) => formatBiller(row));
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
    console.error('Error fetching billers:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch billers', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/billers/categories - List all biller categories
// ============================================
billersRouter.get('/categories', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  try {
    const result = await env.DB.prepare(
      `SELECT category, COUNT(*) as count FROM billers WHERE is_active = 1 GROUP BY category ORDER BY category`
    ).all();

    const categories = (result.results || []).map((row: any) => ({
      category: row.category,
      count: row.count,
      displayName: formatCategoryName(row.category),
    }));

    return jsonResponse(
      successResponse(categories, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching categories:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch categories', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/billers/:id - Get biller by ID
// ============================================
billersRouter.get('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Biller ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const biller = await env.DB.prepare('SELECT * FROM billers WHERE id = ?').bind(id).first();

    if (!biller) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Biller with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    return jsonResponse(
      successResponse(formatBiller(biller), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching biller:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch biller', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/billers - Create a new biller (Admin)
// ============================================
billersRouter.post('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  try {
    const body = await request.json();
    const errors = validateBillerInput(body, true);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid biller data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const id = body.id || `biller-${generateId().slice(0, 8)}`;
    const now = getCurrentTimestamp();

    await env.DB.prepare(
      `INSERT INTO billers (
        id, name, display_name, category, logo_url, description,
        supported_payment_modes, fetch_bill_supported, partial_payment_allowed,
        min_amount, max_amount, customer_id_label, customer_id_pattern,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.name,
        body.displayName || body.display_name,
        body.category,
        body.logoUrl || body.logo_url || null,
        body.description || null,
        JSON.stringify(body.supportedPaymentModes || body.supported_payment_modes || ['upi', 'credit_card', 'debit_card']),
        body.fetchBillSupported ?? body.fetch_bill_supported ?? 1,
        body.partialPaymentAllowed ?? body.partial_payment_allowed ?? 0,
        body.minAmount ?? body.min_amount ?? 1,
        body.maxAmount ?? body.max_amount ?? 100000,
        body.customerIdLabel || body.customer_id_label || 'Customer ID',
        body.customerIdPattern || body.customer_id_pattern || null,
        body.isActive ?? body.is_active ?? 1,
        now,
        now
      )
      .run();

    const created = await env.DB.prepare('SELECT * FROM billers WHERE id = ?').bind(id).first();

    return jsonResponse(
      successResponse(formatBiller(created), { requestId, version: env.API_VERSION }),
      201,
      { 'X-Request-Id': requestId, Location: `/v1/billers/${id}` }
    );
  } catch (error: any) {
    console.error('Error creating biller:', error);
    if (error?.message?.includes('UNIQUE constraint')) {
      return jsonResponse(
        errorResponse('CONFLICT', 'A biller with this ID already exists', requestId),
        409,
        { 'X-Request-Id': requestId }
      );
    }
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to create biller', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// PUT /v1/billers/:id - Update biller (full replace)
// ============================================
billersRouter.put('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Biller ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    // Check if biller exists
    const existing = await env.DB.prepare('SELECT id FROM billers WHERE id = ?').bind(id).first();
    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Biller with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const body = await request.json();
    const errors = validateBillerInput(body, true);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid biller data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const now = getCurrentTimestamp();

    await env.DB.prepare(
      `UPDATE billers SET
        name = ?, display_name = ?, category = ?, logo_url = ?, description = ?,
        supported_payment_modes = ?, fetch_bill_supported = ?, partial_payment_allowed = ?,
        min_amount = ?, max_amount = ?, customer_id_label = ?, customer_id_pattern = ?,
        is_active = ?, updated_at = ?
      WHERE id = ?`
    )
      .bind(
        body.name,
        body.displayName || body.display_name,
        body.category,
        body.logoUrl || body.logo_url || null,
        body.description || null,
        JSON.stringify(body.supportedPaymentModes || body.supported_payment_modes || ['upi', 'credit_card', 'debit_card']),
        body.fetchBillSupported ?? body.fetch_bill_supported ?? 1,
        body.partialPaymentAllowed ?? body.partial_payment_allowed ?? 0,
        body.minAmount ?? body.min_amount ?? 1,
        body.maxAmount ?? body.max_amount ?? 100000,
        body.customerIdLabel || body.customer_id_label || 'Customer ID',
        body.customerIdPattern || body.customer_id_pattern || null,
        body.isActive ?? body.is_active ?? 1,
        now,
        id
      )
      .run();

    const updated = await env.DB.prepare('SELECT * FROM billers WHERE id = ?').bind(id).first();

    return jsonResponse(
      successResponse(formatBiller(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error updating biller:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to update biller', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// PATCH /v1/billers/:id - Partial update biller
// ============================================
billersRouter.patch('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Biller ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT * FROM billers WHERE id = ?').bind(id).first();
    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Biller with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const body = await request.json();
    const errors = validateBillerInput(body, false);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid biller data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      displayName: 'display_name',
      display_name: 'display_name',
      category: 'category',
      logoUrl: 'logo_url',
      logo_url: 'logo_url',
      description: 'description',
      supportedPaymentModes: 'supported_payment_modes',
      supported_payment_modes: 'supported_payment_modes',
      fetchBillSupported: 'fetch_bill_supported',
      fetch_bill_supported: 'fetch_bill_supported',
      partialPaymentAllowed: 'partial_payment_allowed',
      partial_payment_allowed: 'partial_payment_allowed',
      minAmount: 'min_amount',
      min_amount: 'min_amount',
      maxAmount: 'max_amount',
      max_amount: 'max_amount',
      customerIdLabel: 'customer_id_label',
      customer_id_label: 'customer_id_label',
      customerIdPattern: 'customer_id_pattern',
      customer_id_pattern: 'customer_id_pattern',
      isActive: 'is_active',
      is_active: 'is_active',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (body[key] !== undefined) {
        if (!updates.some((u) => u.startsWith(`${dbField} =`))) {
          updates.push(`${dbField} = ?`);
          let value = body[key];
          if (key.includes('PaymentModes') || key.includes('payment_modes')) {
            value = JSON.stringify(value);
          }
          values.push(value);
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

    await env.DB.prepare(`UPDATE billers SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await env.DB.prepare('SELECT * FROM billers WHERE id = ?').bind(id).first();

    return jsonResponse(
      successResponse(formatBiller(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error patching biller:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to update biller', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// DELETE /v1/billers/:id - Delete biller
// ============================================
billersRouter.delete('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'Biller ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT id FROM billers WHERE id = ?').bind(id).first();
    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `Biller with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    // Check for related bills
    const relatedBills = await env.DB.prepare('SELECT COUNT(*) as count FROM bills WHERE biller_id = ?')
      .bind(id)
      .first<{ count: number }>();

    if (relatedBills && relatedBills.count > 0) {
      return jsonResponse(
        errorResponse(
          'CONFLICT',
          `Cannot delete biller. ${relatedBills.count} bill(s) are associated with this biller.`,
          requestId
        ),
        409,
        { 'X-Request-Id': requestId }
      );
    }

    await env.DB.prepare('DELETE FROM billers WHERE id = ?').bind(id).run();

    return jsonResponse(
      successResponse({ deleted: true, id }, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error deleting biller:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to delete biller', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// HEAD /v1/billers/:id - Check biller exists
// ============================================
billersRouter.head('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  try {
    const existing = await env.DB.prepare('SELECT id FROM billers WHERE id = ?').bind(id).first();

    return new Response(null, {
      status: existing ? 200 : 404,
      headers: { 'X-Request-Id': requestId },
    });
  } catch (error) {
    return new Response(null, {
      status: 500,
      headers: { 'X-Request-Id': requestId },
    });
  }
});

// ============================================
// Helper Functions
// ============================================

function formatBiller(row: any): Partial<Biller> {
  if (!row) return {};
  
  let supportedPaymentModes = row.supported_payment_modes;
  if (typeof supportedPaymentModes === 'string') {
    try {
      supportedPaymentModes = JSON.parse(supportedPaymentModes);
    } catch {
      supportedPaymentModes = ['upi', 'credit_card', 'debit_card'];
    }
  }

  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    category: row.category,
    logoUrl: row.logo_url,
    description: row.description,
    supportedPaymentModes,
    fetchBillSupported: Boolean(row.fetch_bill_supported),
    partialPaymentAllowed: Boolean(row.partial_payment_allowed),
    minAmount: row.min_amount,
    maxAmount: row.max_amount,
    customerIdLabel: row.customer_id_label,
    customerIdPattern: row.customer_id_pattern,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function validateBillerInput(body: any, requireAll: boolean): { field: string; code: string; message: string }[] {
  const errors: { field: string; code: string; message: string }[] = [];
  const validCategories = [
    'telecom', 'electricity', 'water', 'gas', 'broadband',
    'dth', 'insurance', 'credit_card', 'loan', 'municipal_tax',
  ];

  if (requireAll) {
    if (!body.name) {
      errors.push({ field: 'name', code: 'REQUIRED', message: 'name is required' });
    }
    if (!body.displayName && !body.display_name) {
      errors.push({ field: 'displayName', code: 'REQUIRED', message: 'displayName is required' });
    }
    if (!body.category) {
      errors.push({ field: 'category', code: 'REQUIRED', message: 'category is required' });
    }
  }

  if (body.category && !validCategories.includes(body.category)) {
    errors.push({
      field: 'category',
      code: 'INVALID_VALUE',
      message: `category must be one of: ${validCategories.join(', ')}`,
    });
  }

  if (body.minAmount !== undefined && (typeof body.minAmount !== 'number' || body.minAmount < 0)) {
    errors.push({ field: 'minAmount', code: 'INVALID_VALUE', message: 'minAmount must be a positive number' });
  }

  if (body.maxAmount !== undefined && (typeof body.maxAmount !== 'number' || body.maxAmount < 0)) {
    errors.push({ field: 'maxAmount', code: 'INVALID_VALUE', message: 'maxAmount must be a positive number' });
  }

  if (body.minAmount && body.maxAmount && body.minAmount > body.maxAmount) {
    errors.push({ field: 'maxAmount', code: 'INVALID_VALUE', message: 'maxAmount must be greater than minAmount' });
  }

  return errors;
}
