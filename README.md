# URL Shortener REST API

A production-grade URL Shortener REST API built with NestJS, PostgreSQL, and Redis. Designed with clean architecture, real system design thinking, and production-ready patterns throughout.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Database | PostgreSQL via TypeORM |
| Cache | Redis via `@keyv/redis` |
| Rate Limiting | `@nestjs/throttler` with Redis storage |
| Auth | JWT (access + refresh tokens), `scrypt` |
| Scheduling | `@nestjs/schedule` |
| Docs | Swagger / OpenAPI |
| Containerization | Docker + Docker Compose |

---

## Features

- **URL Shortening** — guests and authenticated users, with differentiated limits
- **Custom Slugs** — authenticated users can specify a custom alias
- **URL Expiry** — optional TTL per URL, nullable `expires_at` (no redundant boolean)
- **Redirect** — fast slug-based redirect with Redis cache-aside
- **Click Analytics** — total clicks, unique visitors, clicks by day, top referrers, browser and device breakdown
- **JWT Auth** — access + refresh token rotation with HttpOnly cookies
- **RBAC** — role-based access control, secure by default
- **Redis Caching** — cache-aside with sliding TTL for non-expiring URLs, graceful degradation on Redis failure
- **Multi-tier Rate Limiting** — burst, hourly, and daily caps simultaneously, differentiated for guests vs authenticated users
- **Automated Cleanup** — daily cron jobs purge expired URLs and refresh tokens in batches
- **Swagger Docs** — available at `/api/docs` in non-production environments

---

## Architecture

### Folder Structure

Feature-first, not type-first. Every feature owns its module, controller, service, repository, DTOs, entities, and interfaces.

```
src/
├── analytics/          # Click tracking, aggregation queries
├── auth/               # JWT, guards, strategies, refresh tokens
│   └── guards/         # JwtAuthGuard, RolesGuard, ThrottlerGuard
├── cache/              # CacheService — Redis abstraction
├── common/             # Shared decorators, filters, interceptors, pipes
│   └── utils/          # PasswordUtil (scrypt)
├── config/             # Joi validation schema
├── scheduler/          # Cron jobs — URL cleanup, token cleanup
├── urls/               # URL shortening, redirect, CRUD
└── users/              # User entity, repository
```

### Layer Separation

```
Controller  →  validates input, delegates, returns response
Service     →  business logic, throws HTTP exceptions
Repository  →  data access, throws domain errors
```

Controllers handle nothing beyond routing. Services never touch the database directly. Repositories never throw HTTP exceptions.

---

## Key Design Decisions

### Authentication — `scrypt` over `bcrypt`

Password hashing uses Node's native `crypto.scrypt` with `timingSafeEqual` for constant-time comparison. `scrypt` is memory-hard, making it more resistant to GPU brute-force attacks than `bcrypt`. No external dependency required.

### Refresh Token Rotation with `sid`

Each refresh token row has a UUID primary key. That UUID (`sid`) is embedded in the access token payload alongside `userId` and `role`. On logout, the `sid` from the access token is used to delete the exact session row — enabling single-device logout without needing the refresh token cookie present at logout time.

```
Access token payload: { sub, role, sid }
```

### Secure by Default

`JwtAuthGuard` is registered globally. Every endpoint requires authentication unless explicitly decorated with `@Public()`. There is no opt-in auth — only opt-out. A third state `@OptionalAuth()` exists for `POST /urls` which serves both guests and authenticated users with different limits.

### Cache-Aside Pattern

On redirect:
1. Check Redis for slug → hit: return immediately, trust Redis TTL
2. Miss: query PostgreSQL, populate cache, return

No redundant expiry check on cache hit — if the key exists in Redis, it's valid by definition. Redis TTL handles expiry.

Sliding TTL for permanent URLs (no `expiresAt`) — TTL resets on every redirect hit, keeping hot URLs warm indefinitely.

Redis failures are caught and logged. They never crash a request — the system degrades to database-only reads gracefully.

### Multi-Tier Rate Limiting

Three simultaneous sliding windows prevent both burst abuse and sustained abuse:

| Tier | Window | Global Limit |
|---|---|---|
| short | 1 minute | 10 requests |
| medium | 1 hour | 100 requests |
| long | 24 hours | 1000 requests |

`POST /urls` has differentiated limits:

| User Type | Per Minute | Per Hour | Per Day |
|---|---|---|---|
| Guest | 3 | 20 | 50 |
| Authenticated | 20 | 100 | 500 |

Tracker key: `userId` for authenticated users, `req.ip` for guests (Express `trust proxy` enabled for correct IP behind reverse proxies).

Auth endpoints have tighter limits with longer block durations to slow credential stuffing attacks.

### Atomic Slug Generation

Slug uniqueness is enforced via a database unique constraint. Generation uses insert-and-catch (catches `UniqueViolation`) rather than check-then-insert. This eliminates the race condition window that exists in a "check if slug exists, then insert" approach.

### Analytics — DB-Side Processing

Browser and device categorization happens in PostgreSQL via `CASE` expressions inside `createQueryBuilder` queries — no external user-agent parsing library needed. `TO_CHAR` is used for date grouping to prevent server-to-client timezone shifting bugs.

IP addresses are SHA-256 hashed before storage for privacy compliance.

### Composite Index on Analytics

```typescript
@Index(['urlId', 'clickedAt'])
```

`urlId` first (equality filter), `clickedAt` second (range filter). Every analytics query filters by `urlId` — the index allows PostgreSQL to jump directly to the relevant rows and scan them in date order without a separate sort pass.

### Batch Cleanup Cron Jobs

Expired URLs and refresh tokens are purged daily at midnight in batches of 1000 rows to avoid table locks on large datasets. Authenticated users' expired URLs are included — an expired URL is dead regardless of ownership.

### Config — No `process.env` in Application Code

All environment variables are loaded through `ConfigModule` with Joi schema validation at startup. If a required variable is missing or invalid, the application refuses to start. `process.env` is only used in `typeorm.config.ts` which runs outside the NestJS container for CLI migrations.

---

## API Endpoints

Full interactive documentation available at `http://localhost:3000/api/docs`

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login, receive tokens as cookies |
| POST | `/auth/refresh` | Cookie | Rotate refresh token |
| POST | `/auth/logout` | Public* | Invalidate session |

*Logout is public but silently verifies the access token to extract `sid` for session deletion.

### URLs
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/urls` | Optional | Create short URL |
| GET | `/urls` | Required | List user's URLs |
| GET | `/urls/:id` | Required | Get URL by ID |
| PATCH | `/urls/:id` | Required | Update URL |
| DELETE | `/urls/:id` | Required | Delete URL |
| GET | `/:slug` | Public | Redirect to original URL |
| GET | `/urls/:id/analytics` | Required | Get click analytics |

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd url-shortener

# Copy environment variables
cp .env.example .env
# Fill in the required values in .env

# Start infrastructure
docker compose up -d

# Install dependencies
npm install

# Run migrations
npm run migration:run

# Start the application
npm run start:dev
```

### Environment Variables

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_NAME=urlshortener

JWT_SECRET=<min 32 characters>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

REDIS_HOST=localhost
REDIS_PORT=6379
```

### Docker Services

| Service | Port | Description |
|---|---|---|
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache + rate limiting |
| Redis Commander | 8081 | Redis visual inspector |

---

## Security Highlights

- Passwords hashed with `scrypt` (memory-hard, GPU-resistant)
- HttpOnly cookies — tokens never exposed to JavaScript
- `secure` cookie flag enabled in production
- Refresh token cookie scoped to `path: '/auth/refresh'` — not sent on every request
- IP hashing before analytics storage — GDPR-aware
- Rate limiting with block durations on auth endpoints — credential stuffing protection
- Swagger disabled in production
- No `process.env` access in application code — startup validation via Joi

---

## What I Learned Building This

This project was built as a structured deep-dive back into backend engineering after two years away. Every decision was made deliberately:

- Why `scrypt` over `bcrypt`
- Why insert-and-catch over check-then-insert for slug generation
- Why cache-aside over write-through for this use case
- Why multi-tier rate limiting catches what single-window doesn't
- Why the repository layer throws domain errors while the service layer throws HTTP exceptions
- Why `sid` in the access token enables logout without the refresh cookie
- Why composite index column order matters for query performance

The goal was not just working code but production-grade thinking at every layer.
