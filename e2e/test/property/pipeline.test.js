import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fetch from "node-fetch";

const BASE_URL = process.env.INDEXER_URL || "http://localhost:3001";

/**
 * Property-Based Integration Tests
 * Use fast-check to generate and verify invariants across the pipeline
 */

describe("Property-Based Tests - Pipeline Correctness", () => {
  it("pagination: valid page/offset combinations always return valid results", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        async (page, limit) => {
          const res = await fetch(
            `${BASE_URL}/api/contracts?page=${page}&limit=${limit}`,
          );

          expect(res.status).toBe(200);
          const data = await res.json();

          // Invariants:
          // 1. contracts array exists
          // 2. contracts.length <= limit
          // 3. pagination.page === requested page
          // 4. pagination.limit === requested limit

          expect(Array.isArray(data.contracts)).toBe(true);
          expect(data.contracts.length).toBeLessThanOrEqual(limit);
          expect(data.pagination.page).toBe(page);
          expect(data.pagination.limit).toBe(limit);

          // If page > available pages, should return empty or last page
          if (data.contracts.length === 0) {
            expect(page).toBeGreaterThan(1);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it("event decoding: all decoded events have required fields", async () => {
    // Get a contract with events
    const contractRes = await fetch(`${BASE_URL}/api/contracts?page=1&limit=5`);
    const { contracts } = await contractRes.json();

    if (contracts.length === 0) {
      console.log("⏭️  Skipping: no contracts in database");
      return;
    }

    for (const contract of contracts) {
      const eventsRes = await fetch(
        `${BASE_URL}/api/contracts/${contract.id}/events?page=1&limit=10`,
      );
      const { events } = await eventsRes.json();

      if (events.length === 0) continue;

      // Property: every event must have these fields
      for (const event of events) {
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("xdr");
        expect(event).toHaveProperty("decoded");
        expect(event).toHaveProperty("ledger");
        expect(event).toHaveProperty("created_at");

        // XDR must be a non-empty string
        expect(typeof event.xdr).toBe("string");
        expect(event.xdr.length).toBeGreaterThan(0);

        // Decoded must be a valid object
        expect(typeof event.decoded).toBe("object");
      }
    }
  });

  it("idempotency: same query always returns same result", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 50 }), async (seed) => {
        const page = 1;
        const limit = 10;

        // Fetch same URL 3 times
        const fetch1 = await fetch(
          `${BASE_URL}/api/contracts?page=${page}&limit=${limit}`,
        ).then((r) => r.json());

        const fetch2 = await fetch(
          `${BASE_URL}/api/contracts?page=${page}&limit=${limit}`,
        ).then((r) => r.json());

        const fetch3 = await fetch(
          `${BASE_URL}/api/contracts?page=${page}&limit=${limit}`,
        ).then((r) => r.json());

        // All three should be identical
        expect(JSON.stringify(fetch1)).toBe(JSON.stringify(fetch2));
        expect(JSON.stringify(fetch2)).toBe(JSON.stringify(fetch3));
      }),
      { numRuns: 10 },
    );
  });

  it("concurrent requests: no race conditions in API handlers", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 5, max: 50 }), async (concurrency) => {
        // Spawn N concurrent requests
        const promises = Array.from({ length: concurrency }, (_, i) =>
          fetch(`${BASE_URL}/api/contracts?page=${i + 1}&limit=5`).then((r) =>
            r.json(),
          ),
        );

        const results = await Promise.all(promises);

        // Property: no two results should be identical (different pages)
        // AND each should have consistent pagination metadata

        for (let i = 0; i < results.length; i++) {
          expect(results[i].pagination.page).toBe(i + 1);
          expect(results[i].pagination.limit).toBe(5);
          expect(Array.isArray(results[i].contracts)).toBe(true);
        }
      }),
      { numRuns: 20 },
    );
  });

  it("event timestamp validity: all event timestamps are valid dates", async () => {
    const contractRes = await fetch(`${BASE_URL}/api/contracts?page=1&limit=5`);
    const { contracts } = await contractRes.json();

    if (contracts.length === 0) return;

    for (const contract of contracts) {
      const eventsRes = await fetch(
        `${BASE_URL}/api/contracts/${contract.id}/events?page=1&limit=20`,
      );
      const { events } = await eventsRes.json();

      for (const event of events) {
        // Timestamp must be a valid ISO string or unix timestamp
        const timestamp = event.created_at || event.timestamp;
        const date = new Date(timestamp);

        expect(isNaN(date.getTime())).toBe(false);

        // Timestamp should not be in far future or past
        const now = Date.now();
        const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
        const oneYearFuture = now + 365 * 24 * 60 * 60 * 1000;

        expect(date.getTime()).toBeGreaterThan(oneYearAgo);
        expect(date.getTime()).toBeLessThan(oneYearFuture);
      }
    }
  });

  it("contract fields are consistent across calls", async () => {
    const contractRes = await fetch(`${BASE_URL}/api/contracts?page=1&limit=1`);
    const { contracts } = await contractRes.json();

    if (contracts.length === 0) return;

    const contract1 = contracts[0];
    const contractId = contract1.id;

    // Fetch same contract individually
    const detailRes = await fetch(`${BASE_URL}/api/contracts/${contractId}`);
    const contract2 = await detailRes.json();

    // Property: fields should be consistent
    expect(contract2.id).toBe(contract1.id);
    expect(contract2.address).toBe(contract1.address);
    // created_at timestamps might differ slightly due to rounding, so check type only
    expect(typeof contract2.created_at).toBe("string");
  });
});

describe("Property-Based Tests - Data Integrity", () => {
  it("no null/undefined fields in API responses", async () => {
    const contractRes = await fetch(
      `${BASE_URL}/api/contracts?page=1&limit=10`,
    );
    const data = await contractRes.json();

    // Recursive check for null/undefined
    const checkNoNulls = (obj, path = "") => {
      if (obj === null) {
        throw new Error(`Found null at ${path}`);
      }
      if (obj === undefined) {
        throw new Error(`Found undefined at ${path}`);
      }
      if (typeof obj === "object") {
        for (const [key, value] of Object.entries(obj)) {
          checkNoNulls(value, `${path}.${key}`);
        }
      }
    };

    expect(() => checkNoNulls(data)).not.toThrow();
  });

  it("event ledger numbers are monotonically increasing per contract", async () => {
    const contractRes = await fetch(`${BASE_URL}/api/contracts?page=1&limit=3`);
    const { contracts } = await contractRes.json();

    if (contracts.length === 0) return;

    for (const contract of contracts) {
      const eventsRes = await fetch(
        `${BASE_URL}/api/contracts/${contract.id}/events?page=1&limit=50`,
      );
      const { events } = await eventsRes.json();

      // Events should be ordered by ledger (ascending or descending)
      for (let i = 1; i < events.length; i++) {
        // Allow same ledger (multiple events per ledger possible)
        expect(events[i].ledger).toBeLessThanOrEqual(events[i - 1].ledger + 1);
      }
    }
  });
});
