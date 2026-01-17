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

### 🔍 Query Parameters & Filtering

| Feature | Where to Practice | Example |
|---------|-------------------|---------|
| **Pagination** | All list endpoints | `GET /v1/bills?page=2&limit=5` |
| **Search** | Billers, Users | `GET /v1/billers?search=airtel` |
| **Filter by Status** | Bills, Payments | `GET /v1/bills?status=pending` |
| **Filter by Category** | Billers | `GET /v1/billers?category=telecom` |
| **Date Range Filter** | Bills, Payments | `GET /v1/bills?due_after=2025-01-01` |
| **Boolean Filter** | Billers, Payment Methods | `GET /v1/billers?is_active=true` |

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

---

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

### HTTP Methods Supported

- `GET` - Retrieve resources (with pagination, filtering)
- `POST` - Create new resources
- `PUT` - Full update (replace)
- `PATCH` - Partial update
- `DELETE` - Remove resources
- `HEAD` - Check resource existence

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

## 📦 Project Structure

```
APIAutomation/
├── api/                      # Cloudflare Worker API
│   ├── src/
│   │   ├── index.ts          # Main entry point
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── utils.ts          # Helper functions
│   │   ├── routes/           # Route handlers
│   │   │   ├── auth.ts
│   │   │   ├── billers.ts
│   │   │   ├── bills.ts
│   │   │   ├── health.ts
│   │   │   ├── payment-methods.ts
│   │   │   ├── payments.ts
│   │   │   └── users.ts
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
