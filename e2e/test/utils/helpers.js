import fetch from "node-fetch";

/**
 * E2E Test Helpers & Utilities
 */

const BASE_URL = process.env.INDEXER_URL || "http://localhost:3001";
const TIMEOUT = 5000;

/**
 * Wait for condition to be true (with timeout)
 */
export async function waitFor(condition, maxWaitMs = 10000, intervalMs = 500) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await condition()) {
      return true;
    }
    await sleep(intervalMs);
  }
  throw new Error(`Timeout waiting for condition after ${maxWaitMs}ms`);
}

/**
 * Sleep for N milliseconds
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry async function N times with backoff
 */
export async function retry(fn, maxRetries = 3, initialDelayMs = 100) {
  let lastError;
  let delay = initialDelayMs;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        await sleep(delay);
        delay *= 2; // exponential backoff
      }
    }
  }

  throw lastError;
}

/**
 * Get all contracts with pagination
 */
export async function getAllContracts(limit = 100) {
  const contracts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(
      `${BASE_URL}/api/contracts?page=${page}&limit=${limit}`,
      {
        timeout: TIMEOUT,
      },
    );

    if (res.status !== 200) break;

    const data = await res.json();
    contracts.push(...data.contracts);

    if (data.contracts.length < limit) {
      hasMore = false;
    }
    page++;
  }

  return contracts;
}

/**
 * Get contract by ID
 */
export async function getContract(contractId) {
  const res = await fetch(`${BASE_URL}/api/contracts/${contractId}`, {
    timeout: TIMEOUT,
  });

  if (res.status !== 200) {
    throw new Error(`Contract not found: ${contractId}`);
  }

  return res.json();
}

/**
 * Get events for contract
 */
export async function getContractEvents(contractId, page = 1, limit = 10) {
  const res = await fetch(
    `${BASE_URL}/api/contracts/${contractId}/events?page=${page}&limit=${limit}`,
    { timeout: TIMEOUT },
  );

  if (res.status !== 200) {
    throw new Error(`Failed to fetch events for ${contractId}`);
  }

  return res.json();
}

/**
 * Get all events for a contract (with pagination)
 */
export async function getAllContractEvents(contractId, limit = 50) {
  const events = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await getContractEvents(contractId, page, limit);

    if (!Array.isArray(data.events)) break;

    events.push(...data.events);

    if (data.events.length < limit) {
      hasMore = false;
    }
    page++;
  }

  return events;
}

/**
 * Health check with retry
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { timeout: TIMEOUT });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Wait for indexer to be healthy
 */
export async function waitForIndexer(timeoutMs = 30000) {
  await waitFor(() => checkHealth(), timeoutMs);
}

/**
 * Generate random contract ID (for testing invalid IDs)
 */
export function randomContractId() {
  return (
    "CA" +
    Array.from(
      { length: 54 },
      () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[Math.floor(Math.random() * 32)],
    ).join("")
  );
}

/**
 * Assert response has pagination
 */
export function assertHasPagination(response) {
  if (!response.pagination) {
    throw new Error("Response missing pagination");
  }
  if (typeof response.pagination.page !== "number") {
    throw new Error("Pagination missing page");
  }
  if (typeof response.pagination.limit !== "number") {
    throw new Error("Pagination missing limit");
  }
  if (typeof response.pagination.total !== "number") {
    throw new Error("Pagination missing total");
  }
}

/**
 * Measure request latency
 */
export async function measureLatency(url, options = {}) {
  const start = Date.now();
  const res = await fetch(url, options);
  const duration = Date.now() - start;

  return {
    status: res.status,
    duration,
    data: await res.json(),
  };
}

/**
 * Measure latency percentiles across N requests
 */
export async function measureLatencyPercentiles(url, n = 100) {
  const latencies = [];

  for (let i = 0; i < n; i++) {
    const result = await measureLatency(url);
    latencies.push(result.duration);
  }

  const sorted = latencies.sort((a, b) => a - b);
  const p50 = sorted[Math.floor(n * 0.5)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const p99 = sorted[Math.floor(n * 0.99)];

  return {
    samples: n,
    mean: latencies.reduce((a, b) => a + b) / n,
    min: sorted[0],
    max: sorted[n - 1],
    p50,
    p95,
    p99,
  };
}

/**
 * Load test helper: concurrent requests
 */
export async function loadTest(url, concurrency = 50, durationMs = 10000) {
  const startTime = Date.now();
  let requestCount = 0;
  let errorCount = 0;
  const latencies = [];

  const results = [];

  const makeRequest = async () => {
    try {
      const start = Date.now();
      const res = await fetch(url);
      const duration = Date.now() - start;

      latencies.push(duration);
      requestCount++;
      results.push({ status: res.status, duration, error: null });
    } catch (err) {
      errorCount++;
      results.push({ status: 0, duration: 0, error: err.message });
    }
  };

  // Spawn concurrent workers
  const workers = Array.from({ length: concurrency }, async () => {
    while (Date.now() - startTime < durationMs) {
      await makeRequest();
    }
  });

  await Promise.all(workers);

  const sorted = latencies.sort((a, b) => a - b);

  return {
    totalRequests: requestCount + errorCount,
    successfulRequests: requestCount,
    failedRequests: errorCount,
    errorRate: errorCount / (requestCount + errorCount),
    latencies: {
      mean: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(latencies.length * 0.5)],
      p95: sorted[Math.floor(latencies.length * 0.95)],
      p99: sorted[Math.floor(latencies.length * 0.99)],
    },
  };
}

/**
 * Deep equality check for pagination
 */
export function comparePagination(a, b) {
  return (
    a.page === b.page &&
    a.limit === b.limit &&
    a.total === b.total &&
    a.hasMore === b.hasMore
  );
}

/**
 * Generate test event
 */
export function generateTestEvent(contractId) {
  return {
    contractId,
    type: "transfer",
    timestamp: Date.now(),
    data: {
      from: "GA...",
      to: "GB...",
      amount: "100",
    },
  };
}

export default {
  waitFor,
  sleep,
  retry,
  getAllContracts,
  getContract,
  getContractEvents,
  getAllContractEvents,
  checkHealth,
  waitForIndexer,
  randomContractId,
  assertHasPagination,
  measureLatency,
  measureLatencyPercentiles,
  loadTest,
  comparePagination,
  generateTestEvent,
};
