# 💳 Bill Payment API

A fully functional RESTful API for practicing API automation. Features real CRUD operations, data persistence, and comprehensive documentation via Swagger UI.

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
git clone https://github.com/gauravkhuraana/APIAutomation.git
cd APIAutomation/api

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
# https://gauravkhuraana.github.io/APIAutomation/
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
# https://gauravkhuraana.github.io/APIAutomation/openapi.yaml

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
