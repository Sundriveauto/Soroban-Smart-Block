# Health Check Documentation

## Overview

The indexer provides comprehensive health check endpoints that monitor the status of all critical dependencies and separate liveness from readiness semantics. This enables orchestrators (Kubernetes, Docker Compose, load balancers) to make informed decisions about service health and traffic routing.

## Endpoints

### 1. `/health` - Comprehensive Health Check

**Purpose**: Detailed health status of all dependencies

**HTTP Status Codes**:
- `200`: Service is healthy or degraded (can handle traffic)
- `503`: Service is unhealthy (critical dependencies failed)

**Response Schema**:
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dependencies": {
    "database": {
      "status": "healthy" | "unhealthy",
      "responseTime": 5,
      "connections": {
        "total": 10,
        "idle": 8,
        "active": 2,
        "waiting": 0
      }
    },
    "cache": {
      "status": "healthy" | "unhealthy" | "disabled",
      "responseTime": 2,
      "totalConnections": 42,
      "opsPerSec": 150
    },
    "indexer": {
      "status": "healthy" | "unhealthy",
      "lastLedger": 1234567,
      "lagSeconds": 5,
      "lastSyncAgo": 3
    },
    "workers": {
      "status": "healthy" | "degraded",
      "errors": 0,
      "lastRunAgo": 120
    }
  }
}
```

**Health Status Levels**:
- **healthy**: All dependencies operational
- **degraded**: Critical dependencies healthy, optional dependencies may be impaired (e.g., cache down, workers errors)
- **unhealthy**: Critical dependencies (database or indexer) failed

**Critical vs Optional Dependencies**:
- **Critical** (must be healthy):
  - Database (PostgreSQL)
  - Indexer (ledger sync)
- **Optional** (can be degraded):
  - Cache (Redis) - service falls back to L1 cache
  - Workers - background jobs may be delayed

### 2. `/health/live` - Liveness Probe

**Purpose**: Kubernetes-style liveness check to determine if the process should be restarted

**HTTP Status Codes**:
- `200`: Service is alive (do not restart)

**Response Schema**:
```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**When to Use**:
- Kubernetes `livenessProbe`
- Process monitoring (systemd, supervisord)
- Determining if the application is running

**Note**: This endpoint does NOT check dependencies. It returns 200 as long as the HTTP server is responding.

### 3. `/health/ready` - Readiness Probe

**Purpose**: Kubernetes-style readiness check to determine if the service can handle traffic

**HTTP Status Codes**:
- `200`: Service is ready (route traffic)
- `503`: Service is not ready (do not route traffic)

**Response Schema**:
```json
{
  "status": "ready" | "not_ready",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "reason": "Critical dependencies unhealthy",
  "dependencies": {
    // Same as /health endpoint
  }
}
```

**When to Use**:
- Kubernetes `readinessProbe`
- Load balancer health checks
- Service mesh sidecar configuration
- Determining if traffic should be routed to this instance

**Readiness Logic**:
- Ready if status is `healthy` or `degraded`
- Not ready if status is `unhealthy`

## Dependency Checks

### Database (PostgreSQL)

**Check**: Executes `SELECT 1` query

**Metrics**:
- Response time (milliseconds)
- Connection pool stats (total, idle, active, waiting)

**Healthy When**:
- Query succeeds
- Response time < 1000ms (configurable)

**Unhealthy When**:
- Connection refused
- Query timeout
- Authentication failure

### Cache (Redis L2)

**Check**: Executes `PING` command

**Metrics**:
- Response time (milliseconds)
- Total connections
- Operations per second

**States**:
- **healthy**: Redis connected and responding
- **unhealthy**: Redis connection failed or not responding
- **disabled**: Redis not configured (`REDIS_URL` not set)

**Note**: Cache is optional. Service operates with L1 (in-memory) cache only when Redis is unavailable.

### Indexer (Ledger Sync)

**Check**: Monitors ledger sync progress

**Metrics**:
- Last indexed ledger number
- Lag behind network (seconds)
- Time since last sync (seconds)

**Healthy When**:
- Lag < 120 seconds
- Last sync < 30 seconds ago

**Unhealthy When**:
- Lag ≥ 120 seconds (more than 2 minutes behind)
- No sync in last 30 seconds (indexer stalled)

**How It Works**:
The main indexer daemon updates health status after each ledger batch:
```javascript
updateIndexerStatus(currentLedger, lagSeconds);
```

### Workers (Background Jobs)

**Check**: Monitors background job execution

**Metrics**:
- Recent error count
- Time since last worker run (seconds)

**States**:
- **healthy**: Errors < 10, last run < 5 minutes ago
- **degraded**: Errors ≥ 10 or no run in last 5 minutes

**Background Jobs Monitored**:
- ABI sync (GitHub)
- Burn detector
- RPC metrics collector
- Storage pruner
- Gas guzzlers leaderboard
- Usage tracking
- Audit log management
- Vault ratio refresh

**How It Works**:
Workers report errors:
```javascript
import { reportWorkerError } from "./health.js";
try {
  // worker logic
} catch (err) {
  reportWorkerError();
}
```

## Integration Examples

### Docker Compose

```yaml
services:
  indexer:
    image: soroban-indexer:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: soroban-indexer
spec:
  containers:
  - name: indexer
    image: soroban-indexer:latest
    livenessProbe:
      httpGet:
        path: /health/live
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 2
```

### NGINX Load Balancer

```nginx
upstream soroban_indexer {
    server indexer1:3000 max_fails=3 fail_timeout=30s;
    server indexer2:3000 max_fails=3 fail_timeout=30s;
    check interval=3000 rise=2 fall=3 timeout=1000 type=http;
    check_http_send "GET /health/ready HTTP/1.0\r\n\r\n";
    check_http_expect_alive http_2xx http_3xx;
}
```

### Prometheus Monitoring

```yaml
scrape_configs:
  - job_name: 'soroban-indexer-health'
    metrics_path: '/health'
    scrape_interval: 15s
    static_configs:
      - targets: ['indexer:3000']
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'health_(.*)'
        target_label: __name__
        replacement: 'soroban_indexer_${1}'
```

## Monitoring Best Practices

### Alert Rules

**Critical Alerts** (page immediately):
```
- Database unhealthy for > 1 minute
- Indexer lag > 300 seconds (5 minutes)
- Service unhealthy for > 2 minutes
```

**Warning Alerts** (investigate during business hours):
```
- Cache unavailable
- Worker errors > 5
- Indexer lag > 120 seconds (2 minutes)
- Database response time > 100ms
```

### Metrics to Track

1. **Health Status Duration**:
   - Time spent in each status (healthy, degraded, unhealthy)
   - Frequency of status transitions

2. **Dependency Response Times**:
   - Database query latency
   - Redis ping latency
   - P50, P95, P99 percentiles

3. **Indexer Lag**:
   - Current lag in seconds
   - Maximum lag over time window
   - Lag trend (increasing/decreasing)

4. **Worker Health**:
   - Error rate
   - Last run timestamp
   - Success/failure ratio

### Dashboard Example

```
┌─────────────────────────────────────────────────────┐
│ Soroban Indexer Health                              │
├─────────────────────────────────────────────────────┤
│ Overall Status: ● HEALTHY                           │
│                                                      │
│ Database:   ● HEALTHY    5ms response               │
│ Cache:      ● HEALTHY    2ms response               │
│ Indexer:    ● HEALTHY    Lag: 5s   Ledger: 1234567 │
│ Workers:    ● HEALTHY    0 errors                   │
│                                                      │
│ Uptime: 99.95%    Last Incident: 2 days ago        │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

### Database Unhealthy

**Symptoms**:
```json
{
  "dependencies": {
    "database": {
      "status": "unhealthy",
      "error": "Connection timeout"
    }
  }
}
```

**Possible Causes**:
- PostgreSQL server down
- Network issues
- Connection pool exhausted
- Credentials misconfigured

**Resolution**:
1. Check PostgreSQL server status
2. Verify `DATABASE_URL` environment variable
3. Check connection pool settings
4. Review PostgreSQL logs

### Indexer Unhealthy (High Lag)

**Symptoms**:
```json
{
  "dependencies": {
    "indexer": {
      "status": "unhealthy",
      "lagSeconds": 250,
      "lastSyncAgo": 5
    }
  }
}
```

**Possible Causes**:
- RPC node slow or overloaded
- Database write bottleneck
- High event volume
- Network latency to RPC

**Resolution**:
1. Check RPC node health
2. Review indexer logs for errors
3. Check database performance
4. Consider scaling horizontally

### Cache Degraded

**Symptoms**:
```json
{
  "dependencies": {
    "cache": {
      "status": "unhealthy",
      "error": "Connection refused"
    }
  }
}
```

**Possible Causes**:
- Redis server down
- Network issues
- Redis out of memory
- Configuration issues

**Resolution**:
1. Check Redis server status
2. Verify `REDIS_URL` environment variable
3. Check Redis memory usage
4. Service will continue with L1 cache only

### Workers Degraded

**Symptoms**:
```json
{
  "dependencies": {
    "workers": {
      "status": "degraded",
      "errors": 12,
      "lastRunAgo": 450
    }
  }
}
```

**Possible Causes**:
- Worker job failures
- External API timeouts (GitHub, etc.)
- Resource constraints

**Resolution**:
1. Review worker logs
2. Check external service status
3. Restart service if persistent
4. Background jobs will retry

## API Contract

### Breaking Changes

The health endpoint response structure has been updated from:
```json
{ "status": "ok" }
```

To:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "dependencies": { ... }
}
```

**Migration Guide**:
- Update clients expecting `"ok"` to check for `"healthy"` or `"degraded"`
- Parse `dependencies` object for detailed status
- Update OpenAPI validation if using contract testing

### Backwards Compatibility

- HTTP status codes remain compatible (200 = healthy, 503 = unhealthy)
- Clients checking only status code will continue to work
- Response is always valid JSON

## Security Considerations

### Information Disclosure

Health endpoints expose:
- Internal service architecture
- Dependency versions (in error messages)
- Performance characteristics

**Mitigation**:
- Use network policies to restrict access in production
- Consider authentication for `/health` endpoint
- `/health/live` and `/health/ready` can be public (minimal info)

### Denial of Service

Health checks execute database queries and Redis pings.

**Mitigation**:
- Rate limit health endpoint if needed
- Health checks use lightweight queries (SELECT 1, PING)
- Consider caching health status for 1-2 seconds under high load

## References

- [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Health Check Response Format RFC](https://tools.ietf.org/id/draft-inadarei-api-health-check-06.html)
- [Docker Healthcheck](https://docs.docker.com/engine/reference/builder/#healthcheck)
