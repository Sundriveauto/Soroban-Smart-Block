# E2E Tests — Quick Start Guide

## 60-Second Setup

```bash
cd e2e
npm install && bash setup.sh
npm run test:e2e
```

## Test Commands

```bash
# Fast E2E (API + chaos + property + browser) ~30 min
npm run test:e2e

# Individual suites
npm run test:api              # 2 min  — Integration tests
npm run test:chaos            # 5 min  — Fault injection
npm run test:property         # 10 min — Property-based tests
npm run test:playwright       # 10 min — Browser automation
npm run test:k6               # 6 min  — Load tests (all 3)
npm run test:synthetic        # ? min  — Production monitoring
npm run test:visual           # 15 min — Visual regression

# Everything (only at night!)
npm run test:full             # 5+ hours
```

## Make Shortcuts

```bash
make setup                    # One-time setup
make test                     # Fast E2E
make test-playwright-debug    # Interactive browser mode
make test-k6-baseline         # Just baseline load test
make clean                    # Remove artifacts
make help                     # All targets
```

## Environment Setup

**Prerequisites:**

- Node.js 20+
- PostgreSQL 16+ (running)
- Indexer on :3001
- Frontend on :5173

**Auto-Setup:**

```bash
bash setup.sh  # Checks everything, guides you
```

**Manual Setup:**

```bash
# Terminal 1: Indexer
cd ../indexer && npm start

# Terminal 2: Frontend
cd ../frontend && npm run dev

# Terminal 3: Tests
cd ../e2e && npm run test:e2e
```

## Docker Compose

```bash
# From project root
docker-compose --profile test up -d
sleep 10
cd e2e && npm run test:e2e
```

## Common Issues

| Issue                   | Fix                                      |
| ----------------------- | ---------------------------------------- |
| Services not responding | `curl http://localhost:3001/health`      |
| Playwright timeout      | `npx playwright install --with-deps`     |
| DB connection error     | `docker ps` and check DATABASE_URL       |
| Port already in use     | Kill: `lsof -i :3001` or `lsof -i :5173` |
| Permission denied       | `chmod +x setup.sh`                      |

## File Structure (Key Files)

```
e2e/
├── test/api/integration.test.js       ← Add API tests here
├── test/chaos/fault-injection.test.js ← Add chaos scenarios here
├── test/property/pipeline.test.js     ← Add property tests here
├── test/playwright/main.spec.ts       ← Add browser tests here
├── test/load/baseline.js              ← k6 load tests
└── test/utils/helpers.js              ← Shared utilities
```

## Debug Mode

```bash
# Step through tests in browser
npm run test:playwright:debug

# Watch mode (file changes re-run tests)
npx vitest watch

# k6 run with verbose output
k6 run test/load/baseline.js --vus 5 --duration 30s
```

## Performance Targets

| Test               | Target                  |
| ------------------ | ----------------------- |
| API p95            | < 500ms                 |
| API p99            | < 2s                    |
| Baseline load      | 100 req/s               |
| Spike              | 0→2000 req/s (graceful) |
| Soak               | 4 hours stable          |
| Synthetic SLA      | 95% in 30s              |
| Visual regressions | 0% diff                 |

## CI/CD

- **Every PR:** API + chaos + property + browser (~30 min)
- **Nightly:** Spike + soak + synthetic + visual (~5 hours)
- **Artifacts:** Reports, videos, logs in GitHub Actions

## Next: Read Full Docs

- **How-To Guide:** [`README.md`](./README.md)
- **Technical Details:** [`../docs/E2E_TESTING.md`](../docs/E2E_TESTING.md)
- **Implementation:** [`../docs/E2E_IMPLEMENTATION_SUMMARY.md`](../docs/E2E_IMPLEMENTATION_SUMMARY.md)

## TL;DR

```bash
make setup && make test  # ✅ Done
```
