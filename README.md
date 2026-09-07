# 💳 Bill Payment API

A fully functional RESTful API for practicing API automation. Features real CRUD operations, data persistence, and comprehensive documentation via Swagger UI.

---

## 🎯 Business Flow - How to Use This API

Follow this logical sequence to understand and test the complete bill payment workflow:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           BILL PAYMENT API - BUSINESS FLOW                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │   STEP 1     │     │   STEP 2     │     │   STEP 3     │     │   STEP 4     │
    │  🔐 AUTH    │────▶│  👤 USER    │────▶│  💳 SETUP   │ ───▶│ 📋 BILLERS  │
    │              │     │              │     │              │     │              │
    │ Get Token/   │     │ Create User  │     │ Add Payment  │     │ Browse       │
    │ API Key      │     │ or Use Demo  │     │ Methods      │     │ Billers      │
    └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                           │
    ┌──────────────────────────────────────────────────────────────────────┘
    │
    ▼
    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │   STEP 5     │     │   STEP 6     │     │   STEP 7     │     │   STEP 8     │
    │  📄 BILLS   │────▶│  💰 PAYMENT │────▶│  📊 VERIFY  │────▶│  🔄 REFUND   │
    │              │     │              │     │              │     │  (Optional)  │
    │ Create/Fetch │     │ Process      │     │ Check Status │     │              │
    │ Bills        │     │ Payment      │     │ & History    │     │ Cancel/Refund│
    └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 📍 Step-by-Step API Flow

| Step | Action | Endpoint | Description |
|------|--------|----------|-------------|
| 1️⃣ | **Health Check** | `GET /health` | Verify API is running (no auth needed) |
| 2️⃣ | **Authenticate** | `POST /oauth/token` or use API Key | Get access token or use demo credentials |
| 3️⃣ | **Get/Create User** | `GET /v1/users` or `POST /v1/users` | Use demo user `user-demo-001` or create new |
| 4️⃣ | **Add Payment Method** | `POST /v1/payment-methods` | Register UPI/Card/Wallet for payments |
| 5️⃣ | **Browse Billers** | `GET /v1/billers` | Find service providers (Airtel, TATA, etc.) |
| 6️⃣ | **Create Bill** | `POST /v1/bills` | Register a bill for a biller |
| 7️⃣ | **Process Payment** | `POST /v1/payments` | Pay the bill (~90% success rate) |
| 8️⃣ | **Check Status** | `GET /v1/payments/{id}` | Verify payment status |
| 9️⃣ | **Refund (Optional)** | `POST /v1/payments/{id}/refund` | Request refund for completed payment |

---

## 🧪 Feature Matrix - What to Test Where

### 🔐 Authentication Methods

| Auth Type | How to Use | Best API to Test |
|-----------|------------|------------------|
| **API Key (Header)** | `X-API-Key: demo-api-key-123` | Any endpoint |
| **API Key (Query)** | `?api_key=demo-api-key-123` | `GET /v1/billers?api_key=demo-api-key-123` |
| **Bearer Token** | `Authorization: Bearer demo-jwt-token-456` | `POST /v1/bills` |
| **Basic Auth** | `Authorization: Basic ZGVtbzpwYXNzd29yZDEyMw==` | `GET /v1/users` |
| **OAuth2 Client Credentials** | `POST /oauth/token` with client_id & secret | Token endpoint |
| **OAuth2 Password Grant** | `POST /oauth/token` with username & password | Token endpoint |

### 📝 HTTP Methods

| Method | Where to Practice | Example |
|--------|-------------------|---------|
| **GET** | All list endpoints | `GET /v1/billers` |
| **POST** | Create resources | `POST /v1/users` |
| **PUT** | Full update | `PUT /v1/billers/{id}` |
| **PATCH** | Partial update | `PATCH /v1/bills/{id}` |
| **DELETE** | Remove resources | `DELETE /v1/payment-methods/{id}` |
| **HEAD** | Check existence | `HEAD /v1/billers/{id}` |
| **OPTIONS** | Discover methods | `OPTIONS /v1/bills` → `Allow`, `Accept-Query`, `Accept-Patch` |
| **QUERY** ✨ | Search with a JSON body | `QUERY /v1/bills` with a filter body |

### 🔍 Query Parameters & Filtering

| Feature | Where to Practice | Example |
|---------|-------------------|---------|
| **Pagination** | All list endpoints | `GET /v1/bills?page=2&limit=5` |
| **Search** | Billers, Users | `GET /v1/billers?search=airtel` |
| **Filter by Status** | Bills, Payments | `GET /v1/bills?status=pending` |
| **Filter by Category** | Billers | `GET /v1/billers?category=telecom` |
| **Date Range Filter** | Bills, Payments | `GET /v1/bills?due_after=2025-01-01` |
| **Boolean Filter** | Billers, Payment Methods | `GET /v1/billers?is_active=true` |
| **Sorting** ✨ | Billers, Bills, Payments, Users | `GET /v1/bills?sort=-amount,dueDate` |
| **Sparse Fieldsets** ✨ | Any endpoint | `GET /v1/bills?fields=id,amount,status` |
| **Link Header** ✨ | All list endpoints | `Link: <...page=2>; rel="next"` + `X-Total-Count` |

### ❌ Negative Testing Scenarios

| Scenario | Endpoint | How to Trigger |
|----------|----------|----------------|
| **401 Unauthorized** | Any authenticated endpoint | Remove or invalidate API key |
| **403 Forbidden** | `GET /v1/bills/{id}` | Use bill ID containing "restricted": `restricted-xyz` |
| **404 Not Found** | `GET /v1/billers/{id}` | Use non-existent ID: `biller-xyz-999` |
| **400 Validation Error** | `POST /v1/bills` | Missing required fields or invalid data |
| **409 Conflict** | `DELETE /v1/billers/{id}` | Delete biller that has associated bills |
| **409 Duplicate** | `POST /v1/users` | Create user with existing email |
| **429 Rate Limited** | Any endpoint | Send 100+ requests/minute |
| **Payment Failure** | `POST /v1/payments` | ~10% of payments fail randomly |
| **405 Method Not Allowed** ✨ | Any resource | `PUT /v1/billers` (collection, not item) — returns `Allow` |
| **412 Precondition Failed** ✨ | `PATCH /v1/billers/{id}` | Send a stale `If-Match: "wrong-etag"` |
| **415 Unsupported Media Type** ✨ | `QUERY /v1/bills` | Send `Content-Type: text/plain` |
| **422 Unprocessable Content** ✨ | `QUERY /v1/bills` | Filter on a field that does not exist |
| **409 Idempotency Conflict** ✨ | `POST /v1/payments` | Reuse an `Idempotency-Key` with a different body |
| **Any status you like** ✨ | `/v1/simulate/status/{code}` | `GET /v1/simulate/status/418` |
| **Broken JSON** ✨ | `/v1/simulate/malformed-json` | Truncated body served as `application/json` |

### 🎲 Special Test Scenarios

| Scenario | What to Test | How |
|----------|--------------|-----|
| **Simulated Payment Failure** | Payment processing | Create multiple payments - ~10% will fail with `BANK_DECLINED` |
| **Bill Amount Validation** | Business rules | Try amount < `minAmount` or > `maxAmount` of biller |
| **Fetch Bill** | Integration simulation | `POST /v1/bills/{id}/fetch` (only for billers with `fetchBillSupported: true`) |
| **Refund Flow** | Payment lifecycle | Pay a bill, then refund it |
| **Cancel Payment** | Payment lifecycle | Create payment, then cancel before completion |
| **KYC Verification** | User workflow | `POST /v1/users/{id}/verify-kyc` |
| **Nested Resources** | User relationships | `GET /v1/users/{id}/bills`, `/payment-methods`, `/transactions` |
| **HTTP QUERY** ✨ | Search with a request body | `QUERY /v1/bills` — see the section below |
| **Conditional GET** ✨ | Caching / `304` | `GET` a biller, resend its `ETag` as `If-None-Match` |
| **Optimistic Locking** ✨ | Lost-update prevention | Send `If-Match` on `PATCH`; a stale tag gives `412` |
| **Idempotent Retry** ✨ | Duplicate-charge prevention | Repeat `POST /v1/payments` with the same `Idempotency-Key` |
| **Async Polling** ✨ | `202` → poll → result | `POST /v1/jobs` then poll `GET /v1/jobs/{id}` |
| **JSON Patch** ✨ | RFC 6902 | `PATCH` with `Content-Type: application/json-patch+json` |
| **Bulk Create** ✨ | Partial failure | `POST /v1/billers/bulk` → `207 Multi-Status` |
| **Webhooks** ✨ | Signed callbacks | Register at `/v1/webhooks`, then read the delivery log |
| **Timeouts & Retries** ✨ | Client resilience | `/v1/simulate/delay/{ms}`, `/v1/simulate/flaky` |
| **Redirect Following** ✨ | Client config | `GET /v1/simulate/redirect/5` |
| **SSE Streaming** ✨ | Event streams | `GET /v1/simulate/stream?events=5` |

---

---

## 🔎 The HTTP QUERY Method

`QUERY` is a safe, idempotent HTTP method that carries a request body,
standardised as **[RFC 10008](https://www.rfc-editor.org/info/rfc10008/)**
(Proposed Standard, June 2026). It exists because complex searches do not fit
comfortably in a query string: once you need ranges, `OR` groups and a list of
twenty IDs, a URL becomes unreadable and starts bumping into length limits.
`QUERY` keeps the semantics of `GET` — no side effects, cacheable, safe to
retry — while letting the criteria be structured JSON.

Some clients and proxies still reject verbs they do not recognise, so this API
accepts three equivalent forms. All three run the same code and return the same
body; `meta.querySource` tells you which one you used.

```bash
# 1. Native method
curl -X QUERY https://<host>/v1/bills \
  -H "X-API-Key: demo-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{"filter": {"status": "pending"}}'

# 2. Path fallback  (this is what Swagger UI's "Try it out" sends)
curl -X POST https://<host>/v1/bills/query \
  -H "X-API-Key: demo-api-key-123" \
  -H "Content-Type: application/json" \
  -d '{"filter": {"status": "pending"}}'

# 3. Header override
curl -X POST https://<host>/v1/bills \
  -H "X-API-Key: demo-api-key-123" \
  -H "X-HTTP-Method-Override: QUERY" \
  -H "Content-Type: application/json" \
  -d '{"filter": {"status": "pending"}}'
```

**Queryable resources:** `billers`, `bills`, `payments`, `users`.
Call `GET /v1/query-schema` (or `GET /v1/{resource}/query-schema`) for the full
field list.

### Request body

```json
{
  "filter": {
    "status":  { "in": ["pending", "overdue"] },
    "amount":  { "gte": 500, "lte": 10000 },
    "or": [
      { "billerCategory": "telecom" },
      { "billerCategory": "electricity" }
    ],
    "not": { "customerName": { "isNull": true } }
  },
  "sort":   ["-amount", "dueDate"],
  "fields": ["id", "amount", "status", "dueDate"],
  "page":   1,
  "limit":  20
}
```

| Member | Purpose |
|--------|---------|
| `filter` | Field conditions, AND-ed together unless nested under `or` / `not` |
| `sort` | Field names; `-` prefix sorts descending |
| `fields` | Sparse fieldset — `id` is always kept |
| `page` / `limit` / `offset` | Pagination (max `limit` is 100) |

### Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equal (also the shorthand for a bare value) | `{"status": "paid"}` |
| `ne` | Not equal | `{"status": {"ne": "cancelled"}}` |
| `gt` `gte` `lt` `lte` | Comparisons | `{"amount": {"gte": 500}}` |
| `in` `nin` | In / not in a list | `{"status": {"in": ["pending","overdue"]}}` |
| `contains` `startsWith` `endsWith` | Substring matching | `{"displayName": {"contains": "air"}}` |
| `between` | Inclusive range | `{"amount": {"between": [100, 500]}}` |
| `isNull` | Null check | `{"customerName": {"isNull": true}}` |
| `and` `or` `not` | Combinators (arrays for `and` / `or`) | see above |

### What to assert on

- `200` with the envelope you already know, plus `meta.query` echoing how the
  server interpreted your request
- `ETag` on the result set — resend it as `If-None-Match` to get a `304`
- `Link` and `X-Total-Count` headers for pagination
- `Accept-Query` on every response from a QUERY-capable resource, and *absent*
  from one that is not — that asymmetry is itself worth an assertion
- `405` when you send `QUERY` to a resource that does not support it

The failure modes follow RFC 10008 section 2, and they are easy to conflate —
worth a test each:

| Situation | Status |
|---|---|
| Body sent with no `Content-Type` | `400` |
| Body contradicts the declared type (invalid JSON) | `400` |
| `Content-Type` present but not accepted | `415` |
| Well-formed body, unprocessable query (unknown field or operator) | `422` with per-member `details` |

> **A note on deployment:** Cloudflare Workers handles the `QUERY` verb, but
> corporate proxies and some HTTP clients still refuse unknown methods. If a
> native `QUERY` fails in your environment, the two POST forms above are there
> for exactly that reason — and comparing the three is itself a useful test.

---

## ⚡ Feature Cheat Sheet

Everything below is new alongside the existing CRUD surface.

### Conditional requests

```bash
# Grab a validator
ETAG=$(curl -sD- -o /dev/null https://<host>/v1/billers/biller-airtel-postpaid \
  -H "X-API-Key: demo-api-key-123" | grep -i '^etag:' | cut -d' ' -f2 | tr -d '\r')

# 304 Not Modified
curl -i https://<host>/v1/billers/biller-airtel-postpaid \
  -H "X-API-Key: demo-api-key-123" -H "If-None-Match: $ETAG"

# 412 Precondition Failed - someone else changed it first
curl -i -X PATCH https://<host>/v1/billers/biller-airtel-postpaid \
  -H "X-API-Key: demo-api-key-123" -H 'Content-Type: application/json' \
  -H 'If-Match: "stale-etag"' -d '{"description": "nope"}'
```

The ETag from a `GET` can be sent straight back as `If-Match` — both are derived
from the stored row version, so they always agree.

### Idempotency

```bash
KEY=$(uuidgen)
# Send this twice: the second call replays the first response
curl -i -X POST https://<host>/v1/payments \
  -H "X-API-Key: demo-api-key-123" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" \
  -d '{"billId":"bill-002","amount":100,"paymentMethodId":"pm-upi-001","paymentMethodType":"upi"}'
```

Look for `Idempotency-Replayed: true` and an identical payment `id`. Reusing the
key with a *different* body returns `409`.

### Async jobs

```bash
# 202 Accepted, with Location and Retry-After
curl -i -X POST https://<host>/v1/jobs \
  -H "X-API-Key: demo-api-key-123" -H 'Content-Type: application/json' \
  -d '{"type":"statement-export","durationMs":5000}'

# Poll until status is completed (add "shouldFail": true to test the error path)
curl https://<host>/v1/jobs/<job-id> -H "X-API-Key: demo-api-key-123"
```

### JSON Patch (RFC 6902)

```bash
curl -X PATCH https://<host>/v1/billers/biller-jio-prepaid \
  -H "X-API-Key: demo-api-key-123" \
  -H 'Content-Type: application/json-patch+json' \
  -d '[
    {"op": "test",    "path": "/category",    "value": "telecom"},
    {"op": "replace", "path": "/description", "value": "Updated via JSON Patch"},
    {"op": "replace", "path": "/maxAmount",   "value": 25000}
  ]'
```

A failed `test` returns `409`; a pointer that does not resolve returns `400`.

### Bulk create

```bash
curl -X POST https://<host>/v1/billers/bulk \
  -H "X-API-Key: demo-api-key-123" -H 'Content-Type: application/json' \
  -d '{"items": [
        {"name":"acme-power","displayName":"Acme Power","category":"electricity"},
        {"name":"bad-one","displayName":"Bad","category":"NOT_A_CATEGORY"}
      ]}'
```

Always `207 Multi-Status`, with `summary` counts and a per-item `status`, so you
can assert that item 0 succeeded and item 1 failed validation.

### Webhooks

```bash
# Register (the secret is returned only here)
curl -X POST https://<host>/v1/webhooks \
  -H "X-API-Key: demo-api-key-123" -H 'Content-Type: application/json' \
  -d '{"url":"https://webhook.site/your-id","events":["payment.completed"]}'

# Fire a test delivery, then read the attempt log
curl -X POST https://<host>/v1/webhooks/<id>/test -H "X-API-Key: demo-api-key-123"
curl https://<host>/v1/webhooks/<id>/deliveries  -H "X-API-Key: demo-api-key-123"
```

Deliveries are signed `X-Webhook-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<body>">`
— the same shape Stripe and friends use, so verifying it is realistic practice.
Creating a payment fires `payment.completed` or `payment.failed` automatically.

### Simulation endpoints (no auth)

| Endpoint | What it does |
|----------|--------------|
| `GET /v1/simulate/delay/{ms}` | Responds after a delay, up to 30s |
| `GET /v1/simulate/timeout` | Holds the connection for the full 30s |
| `ANY /v1/simulate/status/{code}` | Any status from 100–599, with the right companion headers |
| `GET /v1/simulate/redirect/{n}` | A chain of `n` 302s |
| `GET /v1/simulate/redirect-to?url=` | Redirect anywhere; `?status=` picks 301/302/303/307/308 |
| `GET /v1/simulate/flaky?failureRate=0.5` | Random `503` with `Retry-After` |
| `GET /v1/simulate/malformed-json` | Truncated body served as `application/json` |
| `GET /v1/simulate/empty` | `204 No Content` |
| `GET /v1/simulate/large?items=1000` | A large JSON array |
| `GET /v1/simulate/bytes/{n}` | Exactly `n` bytes of binary |
| `GET /v1/simulate/stream?events=5` | Server-sent events |
| `ANY /v1/simulate/echo` | Reflects method, headers, cookies, query and body (credentials redacted) |
| `GET /v1/simulate/cache/{seconds}` | Cacheable response with `ETag` and `max-age` |
| `GET /v1/simulate/basic-auth/{user}/{pass}` | `401` challenge unless the credentials match |
| `GET /v1/simulate/cookies/set?a=1&b=2` | Sets cookies from query parameters |
| `GET /v1/simulate/headers?X-Custom=1` | Reflects arbitrary response headers |


## 🛠️ Quick Reference - Demo Data

### Pre-seeded Demo IDs

```
Users:          user-demo-001, user-demo-002, user-demo-003
Billers:        biller-airtel-postpaid, biller-jio-prepaid, biller-tata-power
Payment Methods: pm-upi-001, pm-card-001
```

### Biller Categories
`telecom`, `electricity`, `water`, `gas`, `broadband`, `dth`, `insurance`, `credit_card`

### Payment Method Types
`upi`, `credit_card`, `debit_card`, `net_banking`, `wallet`

### Bill/Payment Statuses
- **Bills**: `pending`, `paid`, `overdue`, `cancelled`, `partially_paid`
- **Payments**: `initiated`, `processing`, `completed`, `failed`, `refunded`, `cancelled`

---

## 🏗️ Architecture

```
┌─────────────────────────┐     ┌─────────────────────────────┐
│   GitHub Pages          │     │   Cloudflare Workers        │
│   (Free Static Hosting) │     │   (Free Serverless API)     │
│                         │     │                             │
│  ┌──────────────────┐   │     │  ┌─────────────────────┐    │
│  │   Swagger UI     │───┼────▶│  │   API Routes        │    │
│  │   (OpenAPI 3.0)  │   │     │  │   /v1/*             │    │
│  └──────────────────┘   │     │  └──────────┬──────────┘    │
│                         │     │             │               │
│  docs/index.html        │     │  ┌──────────▼──────────┐    │
│  docs/openapi.yaml      │     │  │   D1 Database       │    │
└─────────────────────────┘     │  │   (SQLite)          │    │
                                │  └─────────────────────┘    │
                                └─────────────────────────────┘
```

## 🚀 Quick Start

### Demo Credentials

| Auth Method | Credentials |
|-------------|-------------|
| **API Key (Header)** | `X-API-Key: demo-api-key-123` |
| **API Key (Query)** | `?api_key=demo-api-key-123` |
| **Bearer Token** | `Authorization: Bearer demo-jwt-token-456` |
| **Basic Auth** | `Authorization: Basic ZGVtbzpwYXNzd29yZDEyMw==` |
| **OAuth2 Client** | `client_id: demo-client`, `client_secret: demo-secret-789` |

### Example Requests

```bash
# List all billers with API Key
curl -H "X-API-Key: demo-api-key-123" \
  https://billpay-api.your-subdomain.workers.dev/v1/billers

# Create a bill with Bearer token
curl -X POST \
  -H "Authorization: Bearer demo-jwt-token-456" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-demo-001","billerId":"biller-airtel-postpaid","customerIdentifier":"9876543210","amount":599}' \
  https://billpay-api.your-subdomain.workers.dev/v1/bills

# Get OAuth2 token
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=demo-client&client_secret=demo-secret-789" \
  https://billpay-api.your-subdomain.workers.dev/oauth/token
```

## 📚 API Resources

| Resource | Endpoints | Description |
|----------|-----------|-------------|
| **Billers** | `/v1/billers` | Service providers (telecom, electricity, etc.) |
| **Bills** | `/v1/bills` | User bills and bill management |
| **Payments** | `/v1/payments` | Payment processing with simulated success/failure |
| **Payment Methods** | `/v1/payment-methods` | UPI, cards, net banking, wallets |
| **Users** | `/v1/users` | User management with nested resources |
| **Jobs** ✨ | `/v1/jobs` | Async operations — `202 Accepted` and polling |
| **Webhooks** ✨ | `/v1/webhooks` | Signed outbound callbacks with a delivery log |
| **Simulation** ✨ | `/v1/simulate` | Delays, status codes, redirects, streaming (no auth) |
| **Query schema** ✨ | `/v1/query-schema` | Describes the QUERY filter language |

### HTTP Methods Supported

- `GET` - Retrieve resources (with pagination, filtering, sorting, sparse fieldsets)
- `POST` - Create new resources
- `PUT` - Full update (replace)
- `PATCH` - Partial update (merge, or RFC 6902 JSON Patch)
- `DELETE` - Remove resources
- `HEAD` - Check resource existence
- `OPTIONS` - Discover supported methods and body formats
- `QUERY` ✨ - Search using a request body (safe and idempotent)

## 🔧 Local Development

### Prerequisites

- Node.js 18+
- npm or pnpm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (free tier)

### Setup

```bash
# Clone the repository
git clone https://github.com/gauravkhuraana/APIAutomationSwagger.git
cd APIAutomationSwagger/api

# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create billpay-db

# Update wrangler.toml with your database_id
# [[d1_databases]]
# binding = "DB"
# database_name = "billpay-db"
# database_id = "YOUR_DATABASE_ID"

# Run migrations
wrangler d1 execute billpay-db --local --file=src/db/migrations/0001_init.sql

# Seed demo data
wrangler d1 execute billpay-db --local --file=src/db/seed.sql

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev       # Start local dev server (port 8787)
npm run build     # Type-check TypeScript
npm run deploy    # Deploy to Cloudflare Workers
npm run db:migrate # Run migrations (production)
npm run db:seed    # Seed production database
npm run db:reset   # Reset database (local only)
```

## ☁️ Production Deployment

### 1. Deploy the API

```bash
cd api

# Run migrations on production D1
wrangler d1 execute billpay-db --file=src/db/migrations/0001_init.sql
wrangler d1 execute billpay-db --file=src/db/seed.sql

# Deploy to Cloudflare Workers
npm run deploy
```

### 2. Deploy Swagger UI (GitHub Pages)

```bash
# Push docs folder to GitHub
git add docs/
git commit -m "Add Swagger UI documentation"
git push

# Enable GitHub Pages:
# 1. Go to repository Settings > Pages
# 2. Source: Deploy from branch
# 3. Branch: main, /docs folder
# 4. Save

# Your docs will be available at:
# https://gauravkhuraana.github.io/APIAutomationSwagger/
```

### 3. Update OpenAPI Spec

Edit `docs/openapi.yaml` to update the server URL:

```yaml
servers:
  - url: https://billpay-api.your-subdomain.workers.dev
    description: Production
```

## 🗄️ Database Schema

```sql
-- Users
users (id, email, phone, first_name, last_name, kyc_status, address, created_at)

-- Service Providers
billers (id, name, display_name, category, logo_url, supported_payment_modes, ...)

-- User Bills
bills (id, user_id, biller_id, customer_identifier, amount, status, due_date, ...)

-- Payment Methods (UPI, Cards, etc.)
payment_methods (id, user_id, type, display_name, is_default, ...)

-- Payment Transactions
payments (id, bill_id, user_id, amount, status, transaction_id, ...)

-- Transaction History
transactions (id, payment_id, type, amount, status, description, ...)
```

## 🎯 Features for Automation Practice

### ✅ Real CRUD Operations
- All endpoints perform actual database operations
- Data persists across requests
- Realistic validation errors

### ✅ Multiple Auth Methods
- Test different authentication strategies
- Token expiration and refresh flows
- Permission-based access

### ✅ Pagination & Filtering
- Page-based pagination with `page` and `limit`
- Filter by status, category, date ranges
- Search across multiple fields

### ✅ Business Logic
- Payment processing with ~10% simulated failures
- Bill amount validation against biller limits
- Automatic status updates

### ✅ Error Handling
- Consistent error response format
- Detailed validation errors with field-level info
- Request tracing with `X-Request-Id`

### ✅ Rate Limiting
- 100 requests per minute per IP
- `X-RateLimit-*` headers
- `429 Too Many Requests` with `Retry-After`

### ✅ Modern HTTP Semantics ✨
- The `QUERY` method, with method-override and path fallbacks
- `ETag` / `Last-Modified`, `If-None-Match` (`304`) and `If-Match` (`412`)
- `Idempotency-Key` replay protection on payment creation
- `202 Accepted` + `Location` + `Retry-After` async jobs
- RFC 8288 `Link` header pagination and `X-Total-Count`
- RFC 6902 JSON Patch, and `207 Multi-Status` bulk creation
- Proper `405` with `Allow` instead of a bare `404`

### ✅ Resilience Testing ✨
- Configurable delays and a 30-second timeout endpoint
- Any status code on demand, with the right companion headers
- Redirect chains, flaky endpoints and malformed payloads
- Server-sent events and large binary responses
- A request echo that reflects headers, cookies, query and body

## 📦 Project Structure

```
APIAutomation/
├── api/                      # Cloudflare Worker API
│   ├── src/
│   │   ├── index.ts          # Main entry point
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── utils.ts          # Helper functions
│   │   ├── lib/              # Protocol-level building blocks
│   │   │   ├── conditional.ts    # ETag, If-Match / If-None-Match
│   │   │   ├── http.ts           # ETags, Link header, 405 helpers
│   │   │   ├── idempotency.ts    # Idempotency-Key storage and replay
│   │   │   ├── jsonPatch.ts      # RFC 6902
│   │   │   ├── query.ts          # QUERY filter DSL -> SQL
│   │   │   └── resources.ts      # Queryable field registry
│   │   ├── routes/           # Route handlers
│   │   │   ├── auth.ts
│   │   │   ├── billers.ts
│   │   │   ├── bills.ts
│   │   │   ├── bulk.ts           # 207 Multi-Status bulk create
│   │   │   ├── files.ts
│   │   │   ├── health.ts
│   │   │   ├── jobs.ts           # 202 + polling
│   │   │   ├── payment-methods.ts
│   │   │   ├── payments.ts
│   │   │   ├── query.ts          # HTTP QUERY handler
│   │   │   ├── simulate.ts       # Chaos / resilience endpoints
│   │   │   ├── users.ts
│   │   │   └── webhooks.ts       # Signed callbacks + delivery log
│   │   ├── middleware/       # Middleware
│   │   │   ├── auth.ts
│   │   │   ├── cors.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── validation.ts
│   │   └── db/               # Database
│   │       ├── migrations/
│   │       ├── seed.sql
│   │       └── reset.sql
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml
├── docs/                     # GitHub Pages (Swagger UI)
│   ├── index.html
│   └── openapi.yaml
└── README.md
```

## 🧪 Testing with Postman/Newman

```bash
# Import the OpenAPI spec into Postman
# File > Import > URL
# https://gauravkhuraana.github.io/APIAutomationSwagger/openapi.yaml

# Run with Newman
newman run collection.json \
  --environment production.json \
  --env-var "api_key=demo-api-key-123"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless platform
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - SQLite database
- [Swagger UI](https://swagger.io/tools/swagger-ui/) - API documentation
- [itty-router](https://github.com/kwhitley/itty-router) - Lightweight router

---

**Happy Testing!** 🚀

For questions or issues, please open a GitHub issue.
