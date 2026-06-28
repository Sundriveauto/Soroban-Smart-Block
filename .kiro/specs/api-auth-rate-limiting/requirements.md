# Requirements Document

## Introduction

This document defines requirements for adding API authentication and distributed rate limiting to the Soroban Smart Block Explorer REST API. Currently the API has no authentication or rate limiting, making it vulnerable to abuse, DDoS, and unauthorized access. The solution introduces a Redis-backed token bucket rate limiter, a tiered API key system, per-endpoint granular limits, Stripe billing integration, GraphQL query complexity limiting, ML-based abuse detection, a comprehensive audit log, and a rate limit analytics dashboard. All existing endpoints must continue to function without an API key (subject to the Unauthenticated tier limits).

---

## Glossary

- **Rate_Limiter**: The middleware component that enforces request rate limits using the token bucket algorithm in Redis.
- **Token_Bucket**: A rate limiting algorithm that grants tokens at a fixed rate and allows burst consumption up to a maximum bucket size.
- **API_Key**: A secret credential issued to a client that identifies its tier and controls access permissions.
- **Key_Manager**: The admin service that creates, updates, rotates, and revokes API keys.
- **Tier**: A named configuration level (Unauthenticated, Free, Pro, Enterprise) that defines rate limit values for a client.
- **Audit_Logger**: The component that records every API access to the `api_audit_log` PostgreSQL table.
- **Abuse_Detector**: The component that analyses request patterns to identify and respond to malicious behaviour.
- **Usage_Tracker**: The component that aggregates per-key request counts, data transfer, and rate limit hit metrics.
- **Billing_Service**: The component that integrates with Stripe to manage Pro and Enterprise subscription billing.
- **Complexity_Limiter**: The component that analyses incoming GraphQL queries and rejects those exceeding the per-tier cost budget.
- **Analytics_Dashboard**: The frontend page that visualises rate limit hits, top users, violations, and tier upgrade recommendations.
- **CIDR_Whitelist**: A list of IP address ranges in CIDR notation that are permitted to use a given API key.
- **Admin**: An operator authenticated with the `ADMIN_SECRET` environment variable who has access to key management and audit log search endpoints.

---

## Requirements

### Requirement 1: Distributed Token Bucket Rate Limiting

**User Story:** As an API operator, I want Redis-backed distributed rate limiting, so that request quotas are enforced consistently across all server instances.

#### Acceptance Criteria

1. WHEN a request arrives, THE Rate_Limiter SHALL identify the client by API key if the `x-api-key` header is present, or by client IP address otherwise.
2. WHEN a request arrives, THE Rate_Limiter SHALL apply the token bucket algorithm using Redis to enforce the per-tier rate limit.
3. WHEN the token bucket for a client is empty, THE Rate_Limiter SHALL return HTTP 429 with a `Retry-After` header specifying the number of seconds until the next token is available.
4. THE Rate_Limiter SHALL support burst allowances above the sustained rate up to the per-tier burst limit without triggering a 429 response.
5. THE Rate_Limiter SHALL set the following headers on every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Tier`, and `Retry-After` (when applicable).
6. WHILE the Redis connection is unavailable, THE Rate_Limiter SHALL fall back to an in-process rate limiter and SHALL log a warning, ensuring requests are not unconditionally rejected due to Redis failure.
7. THE Rate_Limiter SHALL store token bucket state in Redis keys with TTLs matching the per-tier values: 1 hour for Unauthenticated, 24 hours for Free, 1 month for Pro, and a configurable TTL for Enterprise.

---

### Requirement 2: API Key Tiers

**User Story:** As an API operator, I want four distinct API key tiers with different rate limits, so that I can offer differentiated access levels to clients.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL enforce the following sustained rate limits by tier: Unauthenticated at 60 requests per minute, Free at 1000 requests per minute, Pro at 10000 requests per minute, and Enterprise at a custom operator-configured value.
2. THE Rate_Limiter SHALL enforce the following burst limits by tier: Unauthenticated at 10 additional requests, Free at 50 additional requests, Pro at 200 additional requests, and Enterprise at a custom operator-configured value.
3. WHERE an API key includes a `rate_limit` override field, THE Rate_Limiter SHALL apply the override value in place of the tier default.
4. THE Rate_Limiter SHALL include the active tier name in the `X-RateLimit-Tier` response header.

---

### Requirement 3: Per-Endpoint Granular Rate Limits

**User Story:** As an API operator, I want stricter rate limits on expensive endpoints, so that high-cost operations cannot exhaust quota shared with cheap read endpoints.

#### Acceptance Criteria

1. WHEN a request matches the `GET /api/events` endpoint group, THE Rate_Limiter SHALL apply limits of 60/min (Unauthenticated), 1000/min (Free), and 10000/min (Pro).
2. WHEN a request matches the `GET /api/search` endpoint group, THE Rate_Limiter SHALL apply limits of 30/min (Unauthenticated), 500/min (Free), and 5000/min (Pro).
3. WHEN a request matches the `POST /api/contracts` endpoint group, THE Rate_Limiter SHALL apply limits of 10/min (Unauthenticated), 100/min (Free), and 1000/min (Pro).
4. WHEN a request matches the `POST /api/simulate` endpoint group, THE Rate_Limiter SHALL apply limits of 5/min (Unauthenticated), 50/min (Free), and 500/min (Pro).
5. WHEN a WebSocket connection is initiated, THE Rate_Limiter SHALL apply limits of 3/min (Unauthenticated), 30/min (Free), and 300/min (Pro).
6. THE Rate_Limiter SHALL maintain separate token buckets per client per endpoint group, so that consuming quota on one group does not reduce quota on another group.

---

### Requirement 4: API Key Data Model

**User Story:** As an API operator, I want a well-defined API key record stored in PostgreSQL, so that key metadata, permissions, and usage can be reliably persisted and queried.

#### Acceptance Criteria

1. THE Key_Manager SHALL store each API key with the following fields: `id` (UUID primary key), `name` (human-readable label), `key_hash` (bcrypt hash of the raw key), `key_prefix` (first 8 characters of the raw key for identification), `tier` (one of: unauthenticated, free, pro, enterprise), `rate_limit` (optional integer override), `allowed_ips` (optional JSONB array of CIDR strings), `allowed_endpoints` (optional JSONB array of endpoint patterns), `expires_at` (optional timestamp), `revoked` (boolean, default false), `last_used_at` (timestamp, nullable), and `usage_count` (integer, default 0).
2. WHEN an API key is used, THE Key_Manager SHALL update `last_used_at` to the current timestamp and increment `usage_count` by 1.
3. WHEN an API key has `expires_at` set to a past timestamp, THE Rate_Limiter SHALL treat the key as revoked and return HTTP 401.
4. WHEN an API key has `revoked` set to true, THE Rate_Limiter SHALL return HTTP 401.
5. WHERE an API key specifies `allowed_ips`, THE Rate_Limiter SHALL return HTTP 403 if the client IP does not match any entry in the CIDR whitelist.
6. WHERE an API key specifies `allowed_endpoints`, THE Rate_Limiter SHALL return HTTP 403 if the requested endpoint does not match any entry in the whitelist.

---

### Requirement 5: API Key Management Endpoints

**User Story:** As an admin, I want REST endpoints to create, list, update, rotate, and delete API keys, so that I can manage client access without direct database access.

#### Acceptance Criteria

1. THE Key_Manager SHALL expose `GET /api/admin/api-keys` requiring Admin authentication and returning a paginated list of all non-revoked API key records excluding the `key_hash` field.
2. THE Key_Manager SHALL expose `POST /api/admin/api-keys` requiring Admin authentication, accepting `name`, `tier`, `rate_limit`, `allowed_ips`, `allowed_endpoints`, and `expires_at`, and returning the generated raw API key exactly once in the response body.
3. THE Key_Manager SHALL expose `PATCH /api/admin/api-keys/:id` requiring Admin authentication and allowing updates to `name`, `tier`, `rate_limit`, `allowed_ips`, `allowed_endpoints`, `expires_at`, and `revoked`.
4. THE Key_Manager SHALL expose `DELETE /api/admin/api-keys/:id` requiring Admin authentication and setting `revoked` to true (soft delete).
5. THE Key_Manager SHALL expose `POST /api/admin/api-keys/:id/rotate` requiring Admin authentication, generating a new raw key, replacing `key_hash` and `key_prefix`, and returning the new raw key exactly once.
6. IF an Admin request is made without a valid `ADMIN_SECRET` credential, THEN THE Key_Manager SHALL return HTTP 401.
7. THE Key_Manager SHALL generate API keys as cryptographically random strings of at least 32 bytes encoded in URL-safe base64.

---

### Requirement 6: Usage Tracking

**User Story:** As an API operator, I want per-key usage metrics tracked over time, so that I can monitor consumption, detect anomalies, and support billing.

#### Acceptance Criteria

1. THE Usage_Tracker SHALL record the following metrics per API key per day: total request count, endpoint distribution (request counts per endpoint group), data transfer in megabytes, rate limit hit count, and peak concurrent connection count.
2. WHEN a rate limit is exceeded, THE Usage_Tracker SHALL increment the `rate_limit_hits` counter for the associated key.
3. THE Usage_Tracker SHALL retain daily usage data for 7 days for Free tier keys, 90 days for Pro tier keys, and 3 years for Enterprise tier keys.
4. THE Key_Manager SHALL expose `GET /api/admin/api-keys/:id/usage` requiring Admin authentication and returning the retained daily usage history for the specified key.

---

### Requirement 7: Stripe Billing Integration

**User Story:** As a product owner, I want Pro and Enterprise API subscriptions managed through Stripe, so that billing is automated and tier upgrades are self-service.

#### Acceptance Criteria

1. THE Billing_Service SHALL integrate with the Stripe API to create, update, and cancel subscriptions for Pro ($29/month) and Enterprise (custom) tiers.
2. WHEN a Stripe webhook event of type `customer.subscription.updated` is received, THE Billing_Service SHALL update the associated API key's `tier` field to match the new subscription plan.
3. WHEN a Stripe webhook event of type `customer.subscription.deleted` is received, THE Billing_Service SHALL downgrade the associated API key's `tier` to `free`.
4. THE Billing_Service SHALL verify the Stripe webhook signature using the `STRIPE_WEBHOOK_SECRET` environment variable before processing any webhook payload.
5. IF the Stripe webhook signature verification fails, THEN THE Billing_Service SHALL return HTTP 400 and discard the payload.

---

### Requirement 8: GraphQL Query Complexity Limiting

**User Story:** As an API operator, I want GraphQL queries to be rejected when they exceed a per-tier cost budget, so that complex queries cannot bypass rate limits by consuming disproportionate server resources.

#### Acceptance Criteria

1. THE Complexity_Limiter SHALL assign a cost value to each GraphQL field based on a configurable cost map.
2. WHEN a GraphQL query is received, THE Complexity_Limiter SHALL calculate the total cost by summing field costs, multiplied by list multipliers where applicable.
3. WHEN the calculated query cost exceeds the tier budget, THE Complexity_Limiter SHALL reject the request with HTTP 400 and an error body containing `{"error": "Query complexity exceeded", "cost": <calculated>, "limit": <budget>}`.
4. THE Complexity_Limiter SHALL enforce the following default cost budgets: 100 for Unauthenticated, 500 for Free, 2000 for Pro, and a configurable value for Enterprise.
5. THE Complexity_Limiter SHALL include the calculated cost and remaining budget in the response headers `X-GraphQL-Cost` and `X-GraphQL-Cost-Remaining`.

---

### Requirement 9: Concurrent Request Limiting

**User Story:** As an API operator, I want to cap the number of simultaneous in-flight requests per API key, so that a single client cannot exhaust server thread capacity.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL enforce the following maximum concurrent in-flight request limits per key: 5 for Unauthenticated, 20 for Free, 100 for Pro, and a configurable value for Enterprise.
2. WHEN the concurrent request limit for a key is reached and an additional request arrives, THE Rate_Limiter SHALL return HTTP 503 with a `Retry-After` header indicating 1 second.
3. THE Rate_Limiter SHALL enforce a maximum of 1 concurrent WebSocket connection per key for Unauthenticated, 5 for Free, 25 for Pro, and a configurable value for Enterprise.

---

### Requirement 10: Geographic Rate Limiting

**User Story:** As an API operator, I want the ability to apply different rate limits or blocks per geographic region, so that high-risk regions can be restricted without affecting legitimate users.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL derive the client's geographic region from the client IP address using a configurable GeoIP database.
2. WHERE a region is configured as blocked in the operator's `GEO_BLOCK_LIST` environment variable, THE Rate_Limiter SHALL return HTTP 403 with body `{"error": "Region not permitted"}`.
3. WHERE a region has a configured rate limit multiplier in `GEO_RATE_MULTIPLIERS`, THE Rate_Limiter SHALL scale the tier's base rate limit by that multiplier.

---

### Requirement 11: ML-Based Abuse Detection

**User Story:** As an API operator, I want automated detection of abusive request patterns, so that attacks and scrapers are identified and blocked without manual intervention.

#### Acceptance Criteria

1. WHEN more than 10 authentication failures from the same IP address occur within 60 seconds, THE Abuse_Detector SHALL temporarily block that IP for 15 minutes and increment a `captcha_required` flag in the client's session.
2. WHEN a client issues more than 200 requests per minute with a URL path similarity score above 0.9 (indicating a scraping pattern), THE Abuse_Detector SHALL reduce the client's effective rate limit to 10% of the tier default for 10 minutes.
3. WHEN requests to the same endpoint from more than 50 distinct IP addresses within 10 seconds are detected, THE Abuse_Detector SHALL trigger a DDoS alert and invoke the configured Cloudflare integration webhook if `CLOUDFLARE_WEBHOOK_URL` is set.
4. WHEN a client sequentially paginates through more than 20 consecutive pages on the same endpoint within 60 seconds, THE Abuse_Detector SHALL apply a penalty rate limit of 5 requests per minute on that endpoint for that client for 5 minutes.
5. WHEN a client exceeds its rate limit more than 5 times within 10 minutes, THE Abuse_Detector SHALL flag the key as suspicious and emit a structured warning log entry containing the key prefix, IP, and pattern description.
6. THE Abuse_Detector SHALL persist detection state in Redis to ensure detection works correctly across multiple server instances.

---

### Requirement 12: Audit Logging

**User Story:** As an API operator, I want every API access logged to a searchable audit table, so that I have a complete record of who accessed what and when.

#### Acceptance Criteria

1. THE Audit_Logger SHALL record the following fields for every API request: `timestamp`, `api_key_id` (nullable), `key_name` (nullable), `tier`, `ip`, `method`, `endpoint`, `status_code`, `response_time_ms`, `rate_limit_remaining`, and `user_agent`.
2. THE Audit_Logger SHALL store records in a PostgreSQL table named `api_audit_log` that is automatically partitioned by month using PostgreSQL declarative partitioning.
3. THE Audit_Logger SHALL automatically drop partitions older than the retention period: 90 days for Free, 1 year for Pro, and 3 years for Enterprise.
4. THE Key_Manager SHALL expose `GET /api/admin/audit-log` requiring Admin authentication and accepting filter parameters `api_key_id`, `ip`, `endpoint`, `status_code`, `from`, and `to` (ISO 8601 timestamps), with pagination via `limit` and `offset`.
5. THE Key_Manager SHALL expose `GET /api/admin/audit-log/export` requiring Admin authentication, accepting the same filter parameters, and returning the matching records as either CSV or JSON based on the `format` query parameter.
6. THE Audit_Logger SHALL write log entries asynchronously and SHALL NOT block the HTTP response while persisting the audit record.

---

### Requirement 13: Rate Limit Headers

**User Story:** As an API consumer, I want standardised rate limit headers on every response, so that my client can implement proactive backoff without guessing limits.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL include `X-RateLimit-Limit` on every response, set to the maximum requests per minute for the client's active tier and endpoint group.
2. THE Rate_Limiter SHALL include `X-RateLimit-Remaining` on every response, set to the number of requests remaining in the current window.
3. THE Rate_Limiter SHALL include `X-RateLimit-Reset` on every response, set to the Unix timestamp (seconds) at which the current window resets.
4. THE Rate_Limiter SHALL include `X-RateLimit-Tier` on every response, set to the name of the client's current tier.
5. WHEN the Rate_Limiter returns HTTP 429, THE Rate_Limiter SHALL include `Retry-After` set to the number of whole seconds until a token becomes available.

---

### Requirement 14: Rate Limit Analytics Dashboard

**User Story:** As an API operator, I want a frontend dashboard visualising rate limit activity, so that I can identify usage trends and recommend tier upgrades to heavy users.

#### Acceptance Criteria

1. THE Analytics_Dashboard SHALL display a real-time chart of rate limit hits per minute, updated at most every 5 seconds.
2. THE Analytics_Dashboard SHALL display a ranked table of the top 20 API keys by total request volume over a configurable time window (1 hour, 24 hours, 7 days).
3. THE Analytics_Dashboard SHALL display a heat map of rate limit violations by hour of day and day of week.
4. THE Analytics_Dashboard SHALL display a list of API keys whose 7-day average request rate exceeds 80% of their tier limit, flagged as candidates for a tier upgrade.
5. THE Analytics_Dashboard SHALL require Admin authentication before displaying any data.

---

### Requirement 15: Backward Compatibility

**User Story:** As an existing API consumer, I want all existing endpoints to continue working without an API key, so that my integration is not broken by this feature.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL allow requests without an `x-api-key` header to proceed, applying Unauthenticated tier limits.
2. WHEN an unrecognised API key is provided in the `x-api-key` header, THE Rate_Limiter SHALL return HTTP 401 with body `{"error": "Invalid API key"}`.
3. THE Rate_Limiter SHALL preserve all existing response body structures and HTTP status codes on successful requests.
4. THE Rate_Limiter SHALL add rate limit headers to existing endpoint responses without altering any other existing headers.

---

### Requirement 16: Round-Trip API Key Serialization

**User Story:** As a developer, I want API key records to serialize and deserialize correctly, so that keys stored in and retrieved from the database are equivalent.

#### Acceptance Criteria

1. THE Key_Manager SHALL serialize API key records to and from JSON without data loss.
2. FOR ALL valid ApiKey objects, serializing then deserializing SHALL produce an object equal to the original (round-trip property).
3. IF an invalid or malformed API key JSON payload is provided to a management endpoint, THEN THE Key_Manager SHALL return HTTP 400 with a descriptive validation error.
