// Files Routes - File Upload and Management (multipart/form-data support)

import { Router, IRequest } from 'itty-router';
import { Env, RequestContext, UploadedFile, FileUploadResult } from '../types';
import {
  jsonResponse,
  errorResponse,
  successResponse,
  paginatedResponse,
  calculatePagination,
  parsePaginationParams,
  generateId,
  getCurrentTimestamp,
  formatResponse,
} from '../utils';

export const filesRouter = Router({ base: '/v1/files' });

// In-memory file storage (for demo purposes - files are stored as metadata only)
// In production, you would use R2, S3, or similar object storage
const uploadedFiles: Map<string, UploadedFile> = new Map();

// Allowed MIME types for upload
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ============================================
// POST /v1/files/upload - Upload a single file (multipart/form-data)
// ============================================
filesRouter.post('/upload', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  try {
    const contentType = request.headers.get('Content-Type') || '';

    // Must be multipart/form-data
    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse(
        errorResponse(
          'INVALID_CONTENT_TYPE',
          'Content-Type must be multipart/form-data for file uploads',
          requestId,
          [{ field: 'Content-Type', message: 'Expected multipart/form-data', code: 'INVALID_TYPE' }]
        ),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;

    if (!file) {
      return jsonResponse(
        errorResponse(
          'MISSING_FILE',
          'No file provided in the request. Use "file" field name.',
          requestId,
          [{ field: 'file', message: 'File is required', code: 'REQUIRED' }]
        ),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        errorResponse(
          'FILE_TOO_LARGE',
          `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          requestId,
          [{ field: 'file', message: `Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`, code: 'MAX_SIZE_EXCEEDED' }]
        ),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return jsonResponse(
        errorResponse(
          'INVALID_FILE_TYPE',
          `File type "${file.type}" is not allowed`,
          requestId,
          [{ 
            field: 'file', 
            message: `Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`, 
            code: 'INVALID_MIME_TYPE' 
          }]
        ),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    // Generate file ID and create metadata
    const fileId = `file-${generateId()}`;
    const uploadedFile: UploadedFile = {
      id: fileId,
      filename: `${fileId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedAt: getCurrentTimestamp(),
      userId: ctx?.auth?.identifier,
      metadata: {
        ...(description && { description }),
        ...(category && { category }),
      },
    };

    // Store file metadata (in production, also upload to object storage)
    uploadedFiles.set(fileId, uploadedFile);

    // Read file content for demo (just to show we can access it)
    // In production, you would stream this to R2/S3
    const fileContent = await file.arrayBuffer();
    const fileHash = await crypto.subtle.digest('SHA-256', fileContent);
    const hashArray = Array.from(new Uint8Array(fileHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const result: FileUploadResult = {
      file: uploadedFile,
      url: `/v1/files/${fileId}`,
    };

    return formatResponse(
      request,
      {
        success: true,
        data: {
          ...result,
          checksum: {
            algorithm: 'SHA-256',
            value: hashHex,
          },
        },
        meta: {
          requestId,
          timestamp: getCurrentTimestamp(),
          version: env.API_VERSION || 'v1',
        },
      },
      'uploadResponse',
      201,
      { 
        'X-Request-Id': requestId,
        'Location': `/v1/files/${fileId}`,
      }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return jsonResponse(
      errorResponse('UPLOAD_ERROR', 'Failed to process file upload', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// POST /v1/files/upload-multiple - Upload multiple files
// ============================================
filesRouter.post('/upload-multiple', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();

  try {
    const contentType = request.headers.get('Content-Type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse(
        errorResponse(
          'INVALID_CONTENT_TYPE',
          'Content-Type must be multipart/form-data for file uploads',
          requestId
        ),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const formData = await request.formData();
    const files: File[] = [];
    
    // Collect all files (can be named 'files', 'files[]', 'file1', 'file2', etc.)
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'object' && value !== null && 'name' in value && 'size' in value) {
        files.push(value as File);
      }
    }

    if (files.length === 0) {
      return jsonResponse(
        errorResponse(
          'MISSING_FILES',
          'No files provided in the request',
          requestId
        ),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    if (files.length > 5) {
      return jsonResponse(
        errorResponse(
          'TOO_MANY_FILES',
          'Maximum 5 files can be uploaded at once',
          requestId
        ),
        400,
        { 'X-Request-Id': requestId }
      );
    }

    const results: FileUploadResult[] = [];
    const errors: Array<{ filename: string; error: string }> = [];

    for (const file of files) {
      // Validate each file
      if (file.size > MAX_FILE_SIZE) {
        errors.push({ 
          filename: file.name, 
          error: `File too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)` 
        });
        continue;
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        errors.push({ filename: file.name, error: `Invalid file type: ${file.type}` });
        continue;
      }

      // Process valid file
      const fileId = `file-${generateId()}`;
      const uploadedFile: UploadedFile = {
        id: fileId,
        filename: `${fileId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedAt: getCurrentTimestamp(),
        userId: ctx?.auth?.identifier,
      };

      uploadedFiles.set(fileId, uploadedFile);
      results.push({
        file: uploadedFile,
        url: `/v1/files/${fileId}`,
      });
    }

    return formatResponse(
      request,
      {
        success: true,
        data: {
          uploaded: results,
          failed: errors,
          summary: {
            total: files.length,
            successful: results.length,
            failed: errors.length,
          },
        },
        meta: {
          requestId,
          timestamp: getCurrentTimestamp(),
          version: env.API_VERSION || 'v1',
        },
      },
      'multiUploadResponse',
      results.length > 0 ? 201 : 400,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error uploading files:', error);
    return jsonResponse(
      errorResponse('UPLOAD_ERROR', 'Failed to process file upload', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/files - List uploaded files
// ============================================
filesRouter.get('/', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const url = new URL(request.url);
  const { page, limit, offset } = parsePaginationParams(url);

  const mimeType = url.searchParams.get('mime_type');
  const userId = url.searchParams.get('user_id');

  try {
    let files = Array.from(uploadedFiles.values());

    // Apply filters
    if (mimeType) {
      files = files.filter(f => f.mimeType.includes(mimeType));
    }
    if (userId) {
      files = files.filter(f => f.userId === userId);
    }

    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    const total = files.length;
    const paginatedFiles = files.slice(offset, offset + limit);
    const pagination = calculatePagination(page, limit, total);

    return formatResponse(
      request,
      paginatedResponse(paginatedFiles, pagination, { requestId, version: env.API_VERSION }),
      'filesResponse',
      200,
      { 'X-Request-Id': requestId }
    );
  } catch (error) {
    console.error('Error listing files:', error);
    return jsonResponse(
      errorResponse('DATABASE_ERROR', 'Failed to list files', requestId),
      500,
      { 'X-Request-Id': requestId }
    );
  }
});

// ============================================
// GET /v1/files/:id - Get file metadata
// ============================================
filesRouter.get('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'File ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  const file = uploadedFiles.get(id);

  if (!file) {
    return jsonResponse(
      errorResponse('NOT_FOUND', `File with ID '${id}' not found`, requestId),
      404,
      { 'X-Request-Id': requestId }
    );
  }

  return formatResponse(
    request,
    successResponse(file, { requestId, version: env.API_VERSION }),
    'fileResponse',
    200,
    { 'X-Request-Id': requestId }
  );
});

// ============================================
// DELETE /v1/files/:id - Delete a file
// ============================================
filesRouter.delete('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  if (!id) {
    return jsonResponse(
      errorResponse('INVALID_REQUEST', 'File ID is required', requestId),
      400,
      { 'X-Request-Id': requestId }
    );
  }

  const file = uploadedFiles.get(id);

  if (!file) {
    return jsonResponse(
      errorResponse('NOT_FOUND', `File with ID '${id}' not found`, requestId),
      404,
      { 'X-Request-Id': requestId }
    );
  }

  uploadedFiles.delete(id);

  return formatResponse(
    request,
    {
      success: true,
      data: {
        deleted: true,
        id: id,
        filename: file.originalName,
      },
      meta: {
        requestId,
        timestamp: getCurrentTimestamp(),
        version: env.API_VERSION || 'v1',
      },
    },
    'deleteResponse',
    200,
    { 'X-Request-Id': requestId }
  );
});

// ============================================
// HEAD /v1/files/:id - Check if file exists
// ============================================
filesRouter.head('/:id', async (request: IRequest, env: Env, ctx?: RequestContext) => {
  const requestId = ctx?.requestId || generateId();
  const { id } = request.params || {};

  const file = uploadedFiles.get(id || '');
  
  return new Response(null, {
    status: file ? 200 : 404,
    headers: {
      'X-Request-Id': requestId,
      ...(file && {
        'Content-Type': file.mimeType,
        'Content-Length': String(file.size),
        'X-File-Name': file.originalName,
      }),
    },
  });
});
