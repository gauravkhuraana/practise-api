// Users Routes - User Management

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext, User } from '../types';
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

export const usersRouter = Router({ base: '/v1/users' });

// ============================================
// GET /v1/users - List users
// ============================================
usersRouter.get('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const { page, limit, offset } = parsePaginationParams(url);

  const kycStatus = url.searchParams.get('kyc_status');
  const search = url.searchParams.get('search');
  const createdBy = url.searchParams.get('created_by');

  try {
    let whereClause = 'WHERE 1=1';
    const params: unknown[] = [];

    if (kycStatus) {
      whereClause += ' AND kyc_status = ?';
      params.push(kycStatus);
    }

    if (search) {
      whereClause += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (createdBy) {
      whereClause += ' AND created_by = ?';
      params.push(createdBy);
    }

    const countResult = await env.DB.prepare(`SELECT COUNT(*) as count FROM users ${whereClause}`)
      .bind(...params)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    const users = await env.DB.prepare(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(...params, limit, offset)
      .all();

    const data = (users.results || []).map((row) => formatUser(row));
    const pagination = calculatePagination(page, limit, total);

    return jsonResponse(
      paginatedResponse(data, pagination, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch users', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/users/:id - Get user by ID
// ============================================
usersRouter.get('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'User ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

    if (!user) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `User with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    return jsonResponse(
      successResponse(formatUser(user), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch user', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/users/:id/bills - Get user's bills
// ============================================
usersRouter.get('/:id/bills', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};
  const url = new URL(request.url);
  const { page, limit, offset } = parsePaginationParams(url);

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'User ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    // Verify user exists
    const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!user) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `User with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM bills WHERE user_id = ?')
      .bind(id)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    const bills = await env.DB.prepare(
      `SELECT b.*, bl.display_name as biller_name, bl.category as biller_category
       FROM bills b
       LEFT JOIN billers bl ON b.biller_id = bl.id
       WHERE b.user_id = ?
       ORDER BY b.due_date ASC
       LIMIT ? OFFSET ?`
    )
      .bind(id, limit, offset)
      .all();

    const data = (bills.results || []).map((row: any) => ({
      id: row.id,
      billerId: row.biller_id,
      billerName: row.biller_name,
      billerCategory: row.biller_category,
      customerIdentifier: row.customer_identifier,
      nickname: row.nickname,
      amount: { value: row.amount, currency: row.currency || 'INR' },
      dueDate: row.due_date,
      status: row.status,
    }));

    const pagination = calculatePagination(page, limit, total);

    return jsonResponse(
      paginatedResponse(data, pagination, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching user bills:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch user bills', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/users/:id/payment-methods
// ============================================
usersRouter.get('/:id/payment-methods', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'User ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!user) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `User with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const methods = await env.DB.prepare(
      `SELECT * FROM payment_methods WHERE user_id = ? AND is_active = 1 ORDER BY is_default DESC`
    )
      .bind(id)
      .all();

    const data = (methods.results || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      displayName: row.display_name,
      isDefault: Boolean(row.is_default),
    }));

    return jsonResponse(
      successResponse(data, { requestId, version: env.API_VERSION }),
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
// GET /v1/users/:id/transactions
// ============================================
usersRouter.get('/:id/transactions', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};
  const url = new URL(request.url);
  const { page, limit, offset } = parsePaginationParams(url);

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'User ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!user) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `User with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?')
      .bind(id)
      .first<{ count: number }>();
    const total = countResult?.count || 0;

    const transactions = await env.DB.prepare(
      `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(id, limit, offset)
      .all();

    const data = (transactions.results || []).map((row: any) => ({
      id: row.id,
      paymentId: row.payment_id,
      type: row.type,
      amount: { value: row.amount, currency: row.currency || 'INR' },
      status: row.status,
      description: row.description,
      createdAt: row.created_at,
    }));

    const pagination = calculatePagination(page, limit, total);

    return jsonResponse(
      paginatedResponse(data, pagination, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to fetch transactions', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/users - Create user
// ============================================
usersRouter.post('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  try {
    const body = await request.json();
    const errors = validateUserInput(body, true);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid user data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    // Check for duplicate email
    const existingEmail = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(body.email)
      .first();
    if (existingEmail) {
      return jsonResponse(
        errorResponse('CONFLICT', 'A user with this email already exists', requestId),
        409,
        { 'X-Request-Id': requestId }
      );
    }

    const id = body.id || `user-${generateId().slice(0, 8)}`;
    const now = getCurrentTimestamp();

    await env.DB.prepare(
      `INSERT INTO users (
        id, email, phone, first_name, last_name, password_hash, kyc_status,
        address_line1, address_line2, city, state, postal_code, country,
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        body.email,
        body.phone || null,
        body.firstName || body.first_name,
        body.lastName || body.last_name || null,
        body.password || 'defaultpass123', // Demo password
        body.kycStatus || body.kyc_status || 'pending',
        body.address?.line1 || body.addressLine1 || body.address_line1 || null,
        body.address?.line2 || body.addressLine2 || body.address_line2 || null,
        body.address?.city || body.city || null,
        body.address?.state || body.state || null,
        body.address?.postalCode || body.postalCode || body.postal_code || null,
        body.address?.country || body.country || 'IN',
        now,
        now,
        ctx?.auth?.identifier || 'api'
      )
      .run();

    const created = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

    return jsonResponse(
      successResponse(formatUser(created), { requestId, version: env.API_VERSION }),
      201,
      { 'X-Request-Id': requestId, Location: `/v1/users/${id}` }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error?.message?.includes('UNIQUE constraint')) {
      return jsonResponse(
        errorResponse('CONFLICT', 'User with this ID or email already exists', requestId),
        409,
        { 'X-Request-Id': requestId }
      );
    }
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to create user', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// PUT /v1/users/:id - Full update
// ============================================
usersRouter.put('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'User ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `User with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const body = await request.json();
    const errors = validateUserInput(body, true);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid user data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const now = getCurrentTimestamp();

    await env.DB.prepare(
      `UPDATE users SET
        email = ?, phone = ?, first_name = ?, last_name = ?, kyc_status = ?,
        address_line1 = ?, address_line2 = ?, city = ?, state = ?, postal_code = ?, country = ?,
        updated_at = ?
      WHERE id = ?`
    )
      .bind(
        body.email,
        body.phone || null,
        body.firstName || body.first_name,
        body.lastName || body.last_name || null,
        body.kycStatus || body.kyc_status || 'pending',
        body.address?.line1 || body.addressLine1 || null,
        body.address?.line2 || body.addressLine2 || null,
        body.address?.city || body.city || null,
        body.address?.state || body.state || null,
        body.address?.postalCode || body.postalCode || null,
        body.address?.country || body.country || 'IN',
        now,
        id
      )
      .run();

    const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

    return jsonResponse(
      successResponse(formatUser(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error?.message?.includes('UNIQUE constraint')) {
      return jsonResponse(
        errorResponse('CONFLICT', 'Email already in use by another user', requestId),
        409,
        { 'X-Request-Id': requestId }
      );
    }
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to update user', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// PATCH /v1/users/:id - Partial update
// ============================================
usersRouter.patch('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'User ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `User with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const body = await request.json();
    const errors = validateUserInput(body, false);

    if (errors.length > 0) {
      return jsonResponse(
        errorResponse('VALIDATION_ERROR', 'Invalid user data', requestId, errors),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      email: 'email',
      phone: 'phone',
      firstName: 'first_name',
      first_name: 'first_name',
      lastName: 'last_name',
      last_name: 'last_name',
      kycStatus: 'kyc_status',
      kyc_status: 'kyc_status',
      addressLine1: 'address_line1',
      address_line1: 'address_line1',
      addressLine2: 'address_line2',
      address_line2: 'address_line2',
      city: 'city',
      state: 'state',
      postalCode: 'postal_code',
      postal_code: 'postal_code',
      country: 'country',
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (body[key] !== undefined && !updates.some((u) => u.startsWith(`${dbField} =`))) {
        updates.push(`${dbField} = ?`);
        values.push(body[key]);
      }
    }

    // Handle nested address object
    if (body.address) {
      if (body.address.line1 !== undefined && !updates.some((u) => u.startsWith('address_line1 ='))) {
        updates.push('address_line1 = ?');
        values.push(body.address.line1);
      }
      if (body.address.city !== undefined && !updates.some((u) => u.startsWith('city ='))) {
        updates.push('city = ?');
        values.push(body.address.city);
      }
      if (body.address.state !== undefined && !updates.some((u) => u.startsWith('state ='))) {
        updates.push('state = ?');
        values.push(body.address.state);
      }
      if (body.address.postalCode !== undefined && !updates.some((u) => u.startsWith('postal_code ='))) {
        updates.push('postal_code = ?');
        values.push(body.address.postalCode);
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

    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

    return jsonResponse(
      successResponse(formatUser(updated), { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error: any) {
    console.error('Error patching user:', error);
    if (error?.message?.includes('UNIQUE constraint')) {
      return jsonResponse(
        errorResponse('CONFLICT', 'Email already in use by another user', requestId),
        409,
        { 'X-Request-Id': requestId }
      );
    }
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to update user', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// DELETE /v1/users/:id - Delete user
// ============================================
usersRouter.delete('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'User ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!existing) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `User with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    // Check for related records
    const relatedBills = await env.DB.prepare('SELECT COUNT(*) as count FROM bills WHERE user_id = ?')
      .bind(id)
      .first<{ count: number }>();

    if (relatedBills && relatedBills.count > 0) {
      return jsonResponse(
        errorResponse(
          'CONFLICT',
          `Cannot delete user. ${relatedBills.count} bill(s) are associated with this user.`,
          requestId
        ),
        409,
        { 'X-Request-Id': requestId }
      );
    }

    // Delete related data
    await env.DB.prepare('DELETE FROM payment_methods WHERE user_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

    return jsonResponse(
      successResponse({ deleted: true, id }, { requestId, version: env.API_VERSION }),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to delete user', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/users/:id/verify-kyc - Update KYC status
// ============================================
usersRouter.post('/:id/verify-kyc', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'User ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  try {
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<any>();
    if (!user) {
      return jsonResponse(
        errorResponse('NOT_FOUND', `User with ID '${id}' not found`, requestId),
        404,
        { 'X-Request-Id': requestId }
      );
    }

    const body = await request.json().catch(() => ({}));
    const newStatus = body.status || 'verified';
    const validStatuses = ['pending', 'verified', 'rejected'];

    if (!validStatuses.includes(newStatus)) {
      return jsonResponse(
        errorResponse(
          'VALIDATION_ERROR',
          `status must be one of: ${validStatuses.join(', ')}`,
          requestId
        ),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const now = getCurrentTimestamp();

    await env.DB.prepare('UPDATE users SET kyc_status = ?, updated_at = ? WHERE id = ?')
      .bind(newStatus, now, id)
      .run();

    const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

    return jsonResponse(
      successResponse(
        {
          ...formatUser(updated),
          kycVerification: {
            previousStatus: user.kyc_status,
            newStatus,
            verifiedAt: now,
          },
        },
        { requestId, version: env.API_VERSION }
      ),
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error verifying KYC:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to update KYC status', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// Helper Functions
// ============================================

function formatUser(row: any): Partial<User> {
  if (!row) return {};

  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    firstName: row.first_name,
    lastName: row.last_name,
    kycStatus: row.kyc_status,
    address: row.address_line1
      ? {
          line1: row.address_line1,
          line2: row.address_line2,
          city: row.city,
          state: row.state,
          postalCode: row.postal_code,
          country: row.country,
        }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateUserInput(body: any, requireAll: boolean): { field: string; code: string; message: string }[] {
  const errors: { field: string; code: string; message: string }[] = [];
  const validKycStatuses = ['pending', 'verified', 'rejected'];

  if (requireAll) {
    if (!body.email) {
      errors.push({ field: 'email', code: 'REQUIRED', message: 'email is required' });
    }
    if (!body.firstName && !body.first_name) {
      errors.push({ field: 'firstName', code: 'REQUIRED', message: 'firstName is required' });
    }
  }

  // Email format validation
  if (body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      errors.push({ field: 'email', code: 'INVALID_FORMAT', message: 'email must be a valid email address' });
    }
  }

  // Phone format validation (optional)
  if (body.phone) {
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(body.phone.replace(/[\s-]/g, ''))) {
      errors.push({ field: 'phone', code: 'INVALID_FORMAT', message: 'phone must be a valid phone number' });
    }
  }

  // KYC status validation
  const kycStatus = body.kycStatus || body.kyc_status;
  if (kycStatus && !validKycStatuses.includes(kycStatus)) {
    errors.push({
      field: 'kycStatus',
      code: 'INVALID_VALUE',
      message: `kycStatus must be one of: ${validKycStatuses.join(', ')}`,
    });
  }

  return errors;
}
