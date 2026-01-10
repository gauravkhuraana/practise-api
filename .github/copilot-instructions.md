# Bill Payment API - Copilot Instructions

## Architecture Overview

This is a **Cloudflare Workers + D1** REST API for bill payment operations, designed for API automation practice. The stack:

- **Runtime**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite-based)
- **Router**: `itty-router` for lightweight routing
- **Frontend**: Static docs UI served from `/docs/ui/`

### Project Structure
```
api/
├── src/index.ts          # Main entry, router setup, middleware chain
├── src/types.ts          # All TypeScript interfaces (Env, domain models, responses)
├── src/utils.ts          # Response builders, pagination, ID generators
├── src/middleware/       # Auth, CORS, rate limiting, validation
├── src/routes/           # Feature routers (billers, bills, payments, users, etc.)
└── src/db/               # SQL migrations and seed data
docs/ui/                  # SPA frontend for testing the API
```

## Key Development Commands

```bash
cd api
npm run dev              # Start local Wrangler dev server
npm run db:migrate       # Apply migrations locally
npm run db:seed          # Seed demo data locally
npm run db:reset         # Reset + seed local database
npm run deploy           # Deploy to Cloudflare
npm run db:migrate:prod  # Apply migrations to production
```

## Patterns & Conventions

### Route Handler Pattern
Routes use `itty-router` with consistent structure. Each route file exports a router:
```typescript
// Example: api/src/routes/billers.ts
export const billersRouter = Router({ base: '/v1/billers' });
billersRouter.get('/', async (request, env, ctx) => { /* handler */ });
```

### Response Format
Always use utility functions from `utils.ts` - never construct responses manually:
- `jsonResponse()` - Wrap any response with proper headers
- `successResponse()` - Single resource responses
- `paginatedResponse()` - List endpoints with pagination
- `errorResponse()` - Error responses with standard structure

### Pagination Pattern
All list endpoints support both offset and cursor pagination:
```typescript
const { page, limit, offset, mode } = parsePaginationParams(url);
const pagination = calculatePagination(page, limit, total, { includeCursors: mode === 'cursor' });
```

### Authentication
Multi-auth system in `middleware/auth.ts`. Precedence: Bearer > API Key Header > API Key Query > Basic > Cookie.
Demo credentials are in `wrangler.toml` - intentionally public for testing.

### Database Access
D1 accessed via `env.DB`. Use parameterized queries:
```typescript
const result = await env.DB.prepare('SELECT * FROM billers WHERE id = ?')
  .bind(billerId)
  .first();
```

### Validation
Use validators from `middleware/validation.ts`:
```typescript
const validation = validateObject(body, {
  email: [required(), isString(), isEmail()],
  amount: [required(), isNumber(), minValue(1)]
});
```

## Domain Model Relationships

```
users (1) → (N) bills → (N) payments
users (1) → (N) payment_methods
billers (1) → (N) bills
```

- Bills require valid `user_id` and `biller_id`
- Payments reference `bill_id` and `payment_method_id`
- Deleting a biller with bills returns 409 Conflict

## Testing Considerations

- **Rate limiting**: 100 requests/minute per IP (configurable via `wrangler.toml`)
- **Payment simulation**: ~90% success rate, ~10% random failures for realism
- **Demo user**: `user-demo-001` is pre-seeded and should not be deleted
- **All CRUD operations work**: Create real data, test negative scenarios

## Adding New Routes

1. Create route file in `api/src/routes/` following existing patterns
2. Export router and register in `api/src/index.ts`
3. Add types to `api/src/types.ts`
4. Create migration in `api/src/db/migrations/` if needed

## Frontend SPA (`docs/ui/`)

A vanilla JS single-page application for testing the API interactively.

### Frontend Architecture
```
docs/ui/
├── app.js              # Main entry, router setup, shared context
├── lib/
│   ├── apiClient.js    # HTTP client with auth headers, rate limit tracking
│   ├── router.js       # Hash-based SPA router
│   └── storage.js      # localStorage wrapper for settings/auth
└── views/              # One file per route (billers.js, bills.js, etc.)
```

### Key Frontend Patterns

**Shared Context Object** - All views receive a `ctx` object:
```javascript
const ctx = {
  api: () => api,        // API client instance
  toast,                 // Show notification
  navigate,              // Hash navigation
  rebuildApi,            // Recreate client after settings change
  clearSession,          // Logout
};
```

**View Pattern** - Each view exports a render function that receives outlet + context:
```javascript
export function renderBillers(outlet, ctx) {
  outlet.innerHTML = `<h1>...</h1>`;  // Set HTML
  const ui = { grid: outlet.querySelector('#grid') };  // Grab refs
  // Attach event handlers, call API, update DOM
}
```

**API Client** - Handles auth headers automatically based on settings:
```javascript
const res = await ctx.api().get('/v1/billers?category=telecom');
const res = await ctx.api().post('/v1/bills', { body: JSON.stringify(data) });
```

**Settings Storage** - Auth and preferences stored in localStorage (`lib/storage.js`):
- `loadSettings()` / `saveSettings()` - Read/write full settings object
- Default base URL points to production Workers endpoint
- Supports switching auth types: `api_key`, `bearer`, `basic`, `cookie`

### Adding a New View

1. Create `docs/ui/views/myview.js` with `export function renderMyView(outlet, ctx)`
2. Import and register in `app.js`: `router.add('/myview', (outlet) => renderMyView(outlet, ctx))`
3. Add nav link in `docs/ui/index.html` sidebar with `data-route="/myview"`
