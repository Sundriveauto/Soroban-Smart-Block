# Implementation Plan: API Authentication and Distributed Rate Limiting

## Overview

Implement the auth/rate-limiting middleware stack for the `indexer` Node.js/Express service. Tasks proceed in dependency order: database schema first, then core middleware components, then admin/billing/dashboard layers, wiring everything into the existing `api.js` entry point last.

## Tasks

- [x] 1. Set up database migrations and Redis namespaces
  - Create `indexer/migrations/005_api_auth_rate_limiting.sql` with `api_keys`, `api_key_usage_daily`, and `api_audit_log` (monthly-partitioned) table definitions, all indexes, and initial 2025-01 / 2025-02 partitions
  - Define the Redis key namespace constants in `indexer/src/rateLimit/constants.js` (all `rl:`, `conc:`, `abuse:`, `usage:` prefixes and TTL values)
  - Add environment variable documentation block to `.env.example` for `ADMIN_SECRET`, `RATE_LIMIT_CONFIG`, `GEO_BLOCK_LIST`, `GEO_RATE_MULTIPLIERS`, `GEOIP_DB_PATH`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `CLOUDFLARE_WEBHOOK_URL`
  - _Requirements: 1.7, 4.1, 12.2_

- [x] 2. Implement API Key Authenticator
  - [x] 2.1 Create `indexer/src/auth/apiKeyAuth.js`
    - Extract `x-api-key` header; fall back to hashed client IP for unauthenticated identity
    - Look up key in PostgreSQL by `key_prefix` (first 8 chars), verify bcrypt hash
    - Maintain an in-memory LRU cache (TTL 30 s, max 1 000 entries) to avoid per-request DB hits
    - Validate: not revoked, not expired, IP CIDR whitelist, endpoint whitelist
    - Attach `req.rateContext` with `{ clientId, tier, rateLimit, keyId, keyName }`
    - Return `401` / `403` error responses as specified in the design
    - Update `last_used_at` and increment `usage_count` on every authenticated request
    - _Requirements: 1.1, 4.2, 4.3, 4.4, 4.5, 4.6, 15.1, 15.2_

  - [ ]* 2.2 Write property test for API Key Authenticator
    - **Property 1: Valid keys always resolve to a rateContext with a recognised tier**
    - **Validates: Requirements 1.1, 2.1**

  - [ ]* 2.3 Write unit tests for apiKeyAuth
    - Test all 401/403 branches (unrecognised key, expired, revoked, IP mismatch, endpoint mismatch)
    - Test LRU cache hit path does not call DB
    - Test unauthenticated fallback assigns `unauthenticated` tier
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 15.1, 15.2_

- [x] 3. Implement Token Bucket Rate Limiter
  - [x] 3.1 Create `indexer/src/rateLimit/endpointGroups.js`
    - Define endpoint group patterns and per-tier limits for `events`, `search`, `contracts`, `simulate`, `websocket`, and a `default` group
    - Export a `resolveEndpointGroup(path)` helper
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Create `indexer/src/rateLimit/tokenBucket.js`
    - Implement `tokenBucketMiddleware` using Redis `CL.THROTTLE` on keys `rl:{clientId}:{endpointGroup}`
    - On Redis failure, fall back to an in-process `Map<clientId, {tokens, lastRefill}>` limiter and emit a `warn` log
    - Return `429` with `Retry-After` when bucket is exhausted
    - Per-key `rate_limit` override respected when present on `req.rateContext`
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 2.1, 2.2, 2.3, 3.6_

  - [ ]* 3.3 Write property test for token bucket
    - **Property 2: Requests within burst never receive 429; requests beyond sustained rate eventually receive 429**
    - **Validates: Requirements 1.3, 1.4, 2.1, 2.2**

  - [ ]* 3.4 Write unit tests for tokenBucket
    - Test Redis fallback path logs warning and continues
    - Test per-key override overrides tier default
    - Test separate bucket per endpoint group (req 3.6)
    - _Requirements: 1.6, 2.3, 3.6_

- [x] 4. Implement Rate Limit Header Writer
  - Create `indexer/src/rateLimit/headers.js` exporting `rateLimitHeaderWriter` middleware
  - Attach `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Tier` on every response; attach `Retry-After` only on 429
  - Read values from `req.rateLimitState` populated by `tokenBucketMiddleware`
  - _Requirements: 1.5, 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 4.1 Write unit tests for rateLimitHeaderWriter
    - Test all five headers are present on 200 responses
    - Test `Retry-After` is set on 429 and absent on 200
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 5. Implement Concurrent Request Limiter
  - Create `indexer/src/rateLimit/concurrentLimiter.js`
  - Use Redis `INCR` / `DECR` on `conc:{clientId}` (HTTP) and `conc:ws:{clientId}` (WebSocket)
  - Set a short TTL safety net on the counter key to avoid leaks on crashed connections
  - DECR on response `finish` event (including errors)
  - Return `503` with `Retry-After: 1` when cap exceeded
  - Tier limits: HTTP 5 / 20 / 100; WebSocket 1 / 5 / 25
  - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 5.1 Write unit tests for concurrentLimiter
    - Test that the counter decrements on response finish even when an error is thrown
    - Test 503 with `Retry-After: 1` is returned at cap
    - _Requirements: 9.1, 9.2_

- [x] 6. Implement GeoIP Rate Limiter
  - Create `indexer/src/rateLimit/geoIpLimiter.js`
  - Load MaxMind GeoLite2-Country database from `GEOIP_DB_PATH` using the `maxmind` npm package
  - Block IPs in `GEO_BLOCK_LIST` with `403 { "error": "Region not permitted" }`
  - Apply multiplier from `GEO_RATE_MULTIPLIERS` to base tier limit before passing to token bucket
  - Gracefully degrade (pass through) when database file is absent
  - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 6.1 Write unit tests for geoIpLimiter
    - Test blocked region returns 403
    - Test multiplier is applied to rateContext before downstream middleware
    - Test pass-through when GEOIP_DB_PATH is unset
    - _Requirements: 10.2, 10.3_

- [x] 7. Implement GraphQL Complexity Limiter
  - Create `indexer/src/rateLimit/graphqlComplexity.js`
  - Parse GraphQL query AST from request body; walk the AST summing field costs × list multipliers using a configurable cost map
  - Reject with `400 { "error": "Query complexity exceeded", "cost": N, "limit": M }` when budget exceeded
  - Add `X-GraphQL-Cost` and `X-GraphQL-Cost-Remaining` headers
  - Cost budgets: 100 / 500 / 2000 / configurable by tier
  - Apply only to GraphQL routes
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 7.1 Write property test for GraphQL Complexity Limiter
    - **Property 3: Calculated complexity is always non-negative and monotonically increases with additional fields**
    - **Validates: Requirements 8.2**

  - [ ]* 7.2 Write unit tests for graphqlComplexity
    - Test query at exactly budget limit is allowed; budget + 1 is rejected
    - Test list multiplier correctly scales cost
    - Test both headers are set on allowed requests
    - _Requirements: 8.3, 8.4, 8.5_

- [x] 8. Implement Abuse Detector
  - Create `indexer/src/rateLimit/abuseDetector.js`
  - Implement all five detection patterns using Redis keys per design (auth brute-force, scraping, DDoS, aggressive pagination, repeat offender)
  - URL similarity uses Jaccard similarity on URL path token sets
  - DDoS detection uses HyperLogLog (`PFADD` / `PFCOUNT`) per endpoint × 10 s window
  - Cloudflare webhook fire is conditional on `CLOUDFLARE_WEBHOOK_URL`
  - All state persisted in Redis for cross-instance consistency
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 8.1 Write property test for Abuse Detector
    - **Property 4: The Jaccard similarity score is always in [0, 1] for any two non-empty URL path sets**
    - **Validates: Requirements 11.2**

  - [ ]* 8.2 Write unit tests for abuseDetector
    - Test auth brute-force threshold triggers 15-min block after 11th failure in 60 s
    - Test repeat offender flag is emitted as structured warning log after 6th breach in 10 min
    - Test scraping penalty reduces effective limit to 10%
    - _Requirements: 11.1, 11.2, 11.5_

- [x] 9. Checkpoint — Ensure all middleware unit tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Admin Auth Middleware and Key Manager
  - [x] 10.1 Create `indexer/src/admin/adminAuth.js`
    - Check `Authorization: Bearer <ADMIN_SECRET>` header; return `401` if missing or wrong
    - _Requirements: 5.6_

  - [x] 10.2 Create `indexer/src/admin/keyManager.js`
    - Implement CRUD service functions: `listKeys`, `createKey`, `updateKey`, `deleteKey` (soft), `rotateKey`, `getKeyUsage`
    - `createKey` / `rotateKey` use `crypto.randomBytes(32)` → URL-safe base64; store bcrypt hash (cost 12)
    - Raw key returned exactly once in response; `key_hash` excluded from list/get responses
    - Validate request body on `createKey` and `updateKey`; return `400` with descriptive error on invalid payload
    - _Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 16.1, 16.3_

  - [ ]* 10.3 Write property test for Key Manager serialization round-trip
    - **Property 5: For all valid ApiKey objects, serialize → deserialize → serialize produces identical JSON**
    - **Validates: Requirements 16.1, 16.2**

  - [ ]* 10.4 Write unit tests for keyManager
    - Test `createKey` returns raw key once and stores hash (not raw key)
    - Test `deleteKey` sets `revoked = true` without removing the row
    - Test `rotateKey` replaces `key_hash` and `key_prefix`
    - Test `400` response on malformed JSON payload
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 16.3_

- [x] 11. Add Admin API Routes
  - Create `indexer/src/routes/admin.js` mounting all admin routes under `/api/admin/`
  - Wire `adminAuth` middleware on all routes
  - Implement paginated `GET /api/admin/api-keys`, `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/rotate`, `GET /:id/usage`
  - Implement `GET /api/admin/audit-log` and `GET /api/admin/audit-log/export` (CSV and JSON via `format` param)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.4, 12.4, 12.5_

  - [ ]* 11.1 Write unit tests for admin routes
    - Test all routes return `401` when `ADMIN_SECRET` header is absent
    - Test `GET /api/admin/api-keys` excludes `key_hash` from response
    - Test `GET /api/admin/audit-log/export?format=csv` returns `Content-Type: text/csv`
    - _Requirements: 5.1, 5.6, 12.5_

- [x] 12. Implement Usage Tracker
  - Create `indexer/src/usage/usageTracker.js`
  - Increment Redis counters `usage:{keyId}:{date}:{metric}` on each request
  - Schedule a `node-cron` job running every minute to flush Redis counters to `api_key_usage_daily` via upsert
  - Track: `total_requests`, `endpoint_distribution` (JSONB), `data_transfer_mb`, `rate_limit_hits`, `peak_concurrent`
  - Schedule a nightly `node-cron` job to `DELETE` rows older than retention period per tier (7d / 90d / 3y)
  - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 12.1 Write unit tests for usageTracker
    - Test `rate_limit_hits` is incremented when a 429 is issued
    - Test retention delete targets correct interval per tier
    - _Requirements: 6.2, 6.3_

- [x] 13. Implement Audit Logger
  - Create `indexer/src/audit/auditLogger.js`
  - Implement an in-process async queue that batches INSERT statements into `api_audit_log`
  - Fire-and-forget via response `finish` hook so HTTP response is never blocked
  - Fields logged: `timestamp`, `api_key_id`, `key_name`, `tier`, `ip`, `method`, `endpoint`, `status_code`, `response_time_ms`, `rate_limit_remaining`, `user_agent`
  - Schedule a monthly `node-cron` job to CREATE the next month's partition and DROP partitions beyond retention
  - _Requirements: 12.1, 12.2, 12.3, 12.6_

  - [ ]* 13.1 Write unit tests for auditLogger
    - Test that the HTTP response `finish` callback queues the record without awaiting DB write
    - Test all required fields are present in the enqueued payload
    - _Requirements: 12.1, 12.6_

- [x] 14. Implement Billing Service
  - Create `indexer/src/billing/stripeWebhook.js`
  - Verify Stripe webhook signature with `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`
  - Handle `customer.subscription.updated` → update `api_keys.tier`
  - Handle `customer.subscription.deleted` → downgrade `api_keys.tier` to `'free'`
  - Return `400` on signature failure; `200` on success
  - Mount at `POST /api/billing/stripe-webhook` (raw body parser required)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 14.1 Write unit tests for stripeWebhook
    - Test `400` response when signature verification throws
    - Test `customer.subscription.deleted` downgrades tier to `free`
    - _Requirements: 7.4, 7.5, 7.3_

- [x] 15. Wire Middleware Stack into Express App
  - In `indexer/src/api.js`, import and mount the full ordered middleware chain immediately after the existing `helmet` / `cors` / `express.json()` block:
    1. `apiKeyAuthenticator`
    2. `geoIpRateLimiter`
    3. `concurrentRequestLimiter`
    4. `tokenBucketRateLimiter`
    5. `graphqlComplexityLimiter` (GraphQL routes only)
    6. `abuseDetector`
    7. `rateLimitHeaderWriter`
  - Register the `auditLogger` response-finish hook globally
  - Import and mount the admin router and billing webhook route
  - Start the `usageTracker` cron jobs alongside existing startup jobs in `index.js`
  - Remove (or deprecate) the existing `generalLimiter` and `writeLimiter` express-rate-limit instances now superseded by the new middleware
  - _Requirements: 1.1, 1.2, 1.5, 15.3, 15.4_

  - [ ]* 15.1 Write integration tests for the full middleware chain
    - Test unauthenticated request flows through chain and receives correct tier headers
    - Test a revoked key is rejected with `401` before reaching any route handler
    - Test backward compatibility: existing `/api/events` response body is unchanged
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 16. Checkpoint — Ensure all middleware and integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 17. Implement Rate Limit Analytics Dashboard
  - [x] 17.1 Add analytics data endpoints to the admin router
    - `GET /api/admin/analytics/rate-limit-hits` — per-minute hit counts for the last N minutes from Redis/DB
    - `GET /api/admin/analytics/top-users?window=1h|24h|7d` — top 20 keys by request volume from `api_key_usage_daily`
    - `GET /api/admin/analytics/violation-heatmap` — hour × day-of-week aggregation from `api_audit_log`
    - `GET /api/admin/analytics/upgrade-recommendations` — keys where 7-day avg > 80% of tier limit
    - All endpoints require admin auth
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 17.2 Create `frontend/src/pages/RateLimitDashboard.tsx`
    - Admin login prompt when `ADMIN_SECRET` is not present in context
    - Polls analytics endpoints every 5 seconds
    - Renders `RateLimitHitsChart`, `TopUsersTable`, `ViolationHeatmap`, `UpgradeRecommendations` sub-components
    - Follow the same pattern as the existing `RpcMetricsDashboard.tsx`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 17.3 Create `frontend/src/components/RateLimitHitsChart.tsx`
    - Real-time line chart of rate limit hits per minute
    - _Requirements: 14.1_

  - [x] 17.4 Create `frontend/src/components/TopUsersTable.tsx`
    - Ranked table of top 20 keys with configurable time window selector (1h / 24h / 7d)
    - _Requirements: 14.2_

  - [ ] 17.5 Create `frontend/src/components/ViolationHeatmap.tsx`
    - Hour-of-day × day-of-week heat map of rate limit violations
    - _Requirements: 14.3_

  - [ ] 17.6 Create `frontend/src/components/UpgradeRecommendations.tsx`
    - List of keys whose 7-day avg exceeds 80% of tier limit
    - _Requirements: 14.4_

  - [ ] 17.7 Register `RateLimitDashboard` route in `frontend/src/App.tsx`
    - Add route entry (e.g. `/admin/rate-limits`) following the existing routing pattern
    - _Requirements: 14.5_

  - [ ]* 17.8 Write unit tests for dashboard components
    - Test `RateLimitDashboard` renders login prompt when no admin token is present
    - Test `TopUsersTable` renders correct number of rows from mock data
    - _Requirements: 14.5_

- [ ] 18. Final Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All JavaScript follows the ESM (`import`/`export`) convention used throughout the `indexer` service
- Property tests use the existing `node --test` runner with a fast-check or similar property library
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation before adding the next layer
