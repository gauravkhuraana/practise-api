// Shared query engine used by the HTTP QUERY method and by GET list endpoints.
//
// It compiles a small, JSON-friendly filter DSL into parameterised SQL, and
// provides sorting, sparse fieldsets and pagination that behave identically
// whether the criteria arrive in a request body (QUERY) or a query string (GET).

export type FieldType = 'string' | 'number' | 'boolean' | 'date';

export interface FieldDef {
  /** Fully-qualified SQL column, e.g. "b.due_date" */
  column: string;
  type: FieldType;
}

export interface ResourceDef {
  /** Resource name as it appears in the URL, e.g. "bills" */
  name: string;
  /** SELECT list, including any joined columns */
  select: string;
  /** FROM clause including joins */
  from: string;
  /** Default ORDER BY applied when the caller does not supply `sort` */
  defaultSort: string;
  /** Map of public (camelCase) field name -> column definition */
  fields: Record<string, FieldDef>;
  /** Row -> public object formatter */
  format: (row: any) => any;
}

export interface QueryIssue {
  field: string;
  code: string;
  message: string;
}

export interface CompiledQuery {
  where: string;
  params: unknown[];
  orderBy: string;
  page: number;
  limit: number;
  offset: number;
  fields: string[] | null;
  issues: QueryIssue[];
  /** Normalised query echoed back in the response meta */
  normalized: {
    filter: unknown;
    sort: string[];
    fields: string[] | null;
    page: number;
    limit: number;
  };
}

/** Operators accepted inside a filter object. */
export const SUPPORTED_OPERATORS = [
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'nin',
  'contains',
  'startsWith',
  'endsWith',
  'between',
  'isNull',
] as const;

export type Operator = (typeof SUPPORTED_OPERATORS)[number];

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;
const MAX_FILTER_DEPTH = 4;

// ============================================
// Value coercion
// ============================================

function coerce(value: unknown, type: FieldType): unknown {
  if (value === null || value === undefined) return null;

  switch (type) {
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? n : null;
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value ? 1 : 0;
      const s = String(value).toLowerCase();
      if (s === 'true' || s === '1') return 1;
      if (s === 'false' || s === '0') return 0;
      return null;
    }
    default:
      return String(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ============================================
// Filter compilation
// ============================================

interface CompileContext {
  resource: ResourceDef;
  params: unknown[];
  issues: QueryIssue[];
}

function compileCondition(
  ctx: CompileContext,
  fieldName: string,
  raw: unknown,
  path: string
): string | null {
  const def = ctx.resource.fields[fieldName];
  if (!def) {
    ctx.issues.push({
      field: path,
      code: 'UNKNOWN_FIELD',
      message: `Unknown field '${fieldName}'. Queryable fields: ${Object.keys(ctx.resource.fields).join(', ')}`,
    });
    return null;
  }

  // Shorthand: { status: "pending" } means { status: { eq: "pending" } }
  const spec: Record<string, unknown> = isPlainObject(raw) ? raw : { eq: raw };
  const clauses: string[] = [];

  for (const [op, value] of Object.entries(spec)) {
    if (!(SUPPORTED_OPERATORS as readonly string[]).includes(op)) {
      ctx.issues.push({
        field: `${path}.${op}`,
        code: 'UNKNOWN_OPERATOR',
        message: `Unknown operator '${op}'. Supported operators: ${SUPPORTED_OPERATORS.join(', ')}`,
      });
      continue;
    }

    switch (op as Operator) {
      case 'eq':
      case 'ne': {
        if (value === null) {
          clauses.push(`${def.column} IS ${op === 'eq' ? '' : 'NOT '}NULL`);
          break;
        }
        clauses.push(`${def.column} ${op === 'eq' ? '=' : '!='} ?`);
        ctx.params.push(coerce(value, def.type));
        break;
      }

      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte': {
        const sqlOp = { gt: '>', gte: '>=', lt: '<', lte: '<=' }[op as 'gt' | 'gte' | 'lt' | 'lte'];
        clauses.push(`${def.column} ${sqlOp} ?`);
        ctx.params.push(coerce(value, def.type));
        break;
      }

      case 'in':
      case 'nin': {
        if (!Array.isArray(value) || value.length === 0) {
          ctx.issues.push({
            field: `${path}.${op}`,
            code: 'INVALID_VALUE',
            message: `Operator '${op}' requires a non-empty array`,
          });
          break;
        }
        const placeholders = value.map(() => '?').join(', ');
        clauses.push(`${def.column} ${op === 'in' ? 'IN' : 'NOT IN'} (${placeholders})`);
        for (const v of value) ctx.params.push(coerce(v, def.type));
        break;
      }

      case 'contains':
      case 'startsWith':
      case 'endsWith': {
        if (def.type !== 'string' && def.type !== 'date') {
          ctx.issues.push({
            field: `${path}.${op}`,
            code: 'INVALID_OPERATOR',
            message: `Operator '${op}' is only valid on string fields`,
          });
          break;
        }
        const term = String(value).replace(/[%_]/g, (m) => `\\${m}`);
        const pattern =
          op === 'contains' ? `%${term}%` : op === 'startsWith' ? `${term}%` : `%${term}`;
        clauses.push(`${def.column} LIKE ? ESCAPE '\\'`);
        ctx.params.push(pattern);
        break;
      }

      case 'between': {
        if (!Array.isArray(value) || value.length !== 2) {
          ctx.issues.push({
            field: `${path}.between`,
            code: 'INVALID_VALUE',
            message: `Operator 'between' requires an array of exactly two values`,
          });
          break;
        }
        clauses.push(`${def.column} BETWEEN ? AND ?`);
        ctx.params.push(coerce(value[0], def.type), coerce(value[1], def.type));
        break;
      }

      case 'isNull': {
        const wantsNull = value === true || value === 'true' || value === 1;
        clauses.push(`${def.column} IS ${wantsNull ? '' : 'NOT '}NULL`);
        break;
      }
    }
  }

  if (clauses.length === 0) return null;
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' AND ')})`;
}

function compileFilterNode(
  ctx: CompileContext,
  node: unknown,
  path: string,
  depth: number
): string | null {
  if (!isPlainObject(node)) {
    ctx.issues.push({ field: path, code: 'INVALID_FILTER', message: 'filter must be an object' });
    return null;
  }

  if (depth > MAX_FILTER_DEPTH) {
    ctx.issues.push({
      field: path,
      code: 'FILTER_TOO_DEEP',
      message: `filter nesting exceeds the maximum depth of ${MAX_FILTER_DEPTH}`,
    });
    return null;
  }

  const clauses: string[] = [];

  for (const [key, value] of Object.entries(node)) {
    const childPath = path ? `${path}.${key}` : key;

    if (key === 'and' || key === 'or') {
      if (!Array.isArray(value) || value.length === 0) {
        ctx.issues.push({
          field: childPath,
          code: 'INVALID_VALUE',
          message: `'${key}' requires a non-empty array of filter objects`,
        });
        continue;
      }
      const parts = value
        .map((child, i) => compileFilterNode(ctx, child, `${childPath}[${i}]`, depth + 1))
        .filter((p): p is string => Boolean(p));
      if (parts.length > 0) {
        clauses.push(`(${parts.join(key === 'and' ? ' AND ' : ' OR ')})`);
      }
      continue;
    }

    if (key === 'not') {
      const inner = compileFilterNode(ctx, value, childPath, depth + 1);
      if (inner) clauses.push(`NOT (${inner})`);
      continue;
    }

    const clause = compileCondition(ctx, key, value, childPath);
    if (clause) clauses.push(clause);
  }

  if (clauses.length === 0) return null;
  return clauses.join(' AND ');
}

// ============================================
// Sort
// ============================================

function compileSort(
  resource: ResourceDef,
  sort: unknown,
  issues: QueryIssue[]
): { orderBy: string; normalized: string[] } {
  const raw: string[] = Array.isArray(sort)
    ? sort.map(String)
    : typeof sort === 'string' && sort.trim()
      ? sort.split(',')
      : [];

  const parts: string[] = [];
  const normalized: string[] = [];

  for (const entry of raw) {
    const token = entry.trim();
    if (!token) continue;

    const desc = token.startsWith('-');
    const name = desc ? token.slice(1) : token.startsWith('+') ? token.slice(1) : token;
    const def = resource.fields[name];

    if (!def) {
      issues.push({
        field: `sort.${name}`,
        code: 'UNKNOWN_FIELD',
        message: `Cannot sort by unknown field '${name}'. Sortable fields: ${Object.keys(resource.fields).join(', ')}`,
      });
      continue;
    }

    parts.push(`${def.column} ${desc ? 'DESC' : 'ASC'}`);
    normalized.push(`${desc ? '-' : ''}${name}`);
  }

  return {
    orderBy: parts.length > 0 ? parts.join(', ') : resource.defaultSort,
    normalized,
  };
}

// ============================================
// Sparse fieldsets
// ============================================

function compileFields(
  resource: ResourceDef,
  fields: unknown,
  issues: QueryIssue[]
): string[] | null {
  const raw: string[] = Array.isArray(fields)
    ? fields.map(String)
    : typeof fields === 'string' && fields.trim()
      ? fields.split(',')
      : [];

  if (raw.length === 0) return null;

  const selected: string[] = [];
  for (const entry of raw) {
    const name = entry.trim();
    if (!name) continue;
    if (!resource.fields[name] && name !== 'id') {
      issues.push({
        field: `fields.${name}`,
        code: 'UNKNOWN_FIELD',
        message: `Unknown field '${name}' in fields projection`,
      });
      continue;
    }
    selected.push(name);
  }

  // `id` is always returned so responses stay addressable.
  if (selected.length > 0 && !selected.includes('id')) selected.unshift('id');
  return selected.length > 0 ? selected : null;
}

/** Apply a sparse fieldset to an already-formatted object. */
export function projectFields<T extends Record<string, unknown>>(
  item: T,
  fields: string[] | null
): Partial<T> {
  if (!fields) return item;
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in item) out[field] = item[field];
  }
  return out as Partial<T>;
}

// ============================================
// Public entry point
// ============================================

export interface QueryInput {
  filter?: unknown;
  sort?: unknown;
  fields?: unknown;
  page?: unknown;
  limit?: unknown;
  offset?: unknown;
}

export function compileQuery(resource: ResourceDef, input: QueryInput): CompiledQuery {
  const issues: QueryIssue[] = [];
  const params: unknown[] = [];

  const ctx: CompileContext = { resource, params, issues };
  const filterSql =
    input.filter === undefined || input.filter === null
      ? null
      : compileFilterNode(ctx, input.filter, '', 1);

  const { orderBy, normalized: sortNormalized } = compileSort(resource, input.sort, issues);
  const fields = compileFields(resource, input.fields, issues);

  const rawLimit = Number(input.limit ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(rawLimit)))
    : DEFAULT_LIMIT;

  let page: number;
  let offset: number;

  if (input.offset !== undefined && input.offset !== null) {
    const rawOffset = Number(input.offset);
    offset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0;
    page = Math.floor(offset / limit) + 1;
  } else {
    const rawPage = Number(input.page ?? 1);
    page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
    offset = (page - 1) * limit;
  }

  return {
    where: filterSql ? `WHERE ${filterSql}` : 'WHERE 1=1',
    params,
    orderBy,
    page,
    limit,
    offset,
    fields,
    issues,
    normalized: {
      filter: input.filter ?? null,
      sort: sortNormalized,
      fields,
      page,
      limit,
    },
  };
}

/** Read sort/fields options straight off a URL, for GET list endpoints. */
export function parseListOptions(
  resource: ResourceDef,
  url: URL
): { orderBy: string | null; fields: string[] | null; issues: QueryIssue[] } {
  const issues: QueryIssue[] = [];
  const sortParam = url.searchParams.get('sort');
  const fieldsParam = url.searchParams.get('fields');

  const orderBy = sortParam ? compileSort(resource, sortParam, issues).orderBy : null;
  const fields = fieldsParam ? compileFields(resource, fieldsParam, issues) : null;

  return { orderBy, fields, issues };
}
