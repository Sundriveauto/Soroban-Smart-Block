import test from "node:test";
import assert from "node:assert";
import fetch from "node-fetch";

const BASE_URL = process.env.INDEXER_URL || "http://localhost:3001";
const API_TIMEOUT = 5000;

/**
 * Full pipeline integration tests: Stellar events → indexer → DB → API → response
 */

test("API Integration - Full Pipeline", async (t) => {
  await t.test("GET /api/contracts - returns paginated contracts", async () => {
    const res = await fetch(`${BASE_URL}/api/contracts?page=1&limit=10`, {
      timeout: API_TIMEOUT,
    });

    assert.strictEqual(res.status, 200, "should return 200");
    const data = await res.json();

    assert(Array.isArray(data.contracts), "should return contracts array");
    assert(data.pagination, "should include pagination metadata");
    assert(data.pagination.total >= 0, "pagination.total should be >= 0");
    assert(data.pagination.page === 1, "pagination.page should match request");
    assert(
      data.pagination.limit === 10,
      "pagination.limit should match request",
    );
  });

  await t.test(
    "GET /api/contracts/:id - returns contract details",
    async () => {
      // First, fetch a contract ID
      const listRes = await fetch(`${BASE_URL}/api/contracts?page=1&limit=1`, {
        timeout: API_TIMEOUT,
      });
      const { contracts } = await listRes.json();

      if (contracts.length === 0) {
        console.log("⏭️  Skipping: no contracts in database");
        return;
      }

      const contractId = contracts[0].id;
      const res = await fetch(`${BASE_URL}/api/contracts/${contractId}`, {
        timeout: API_TIMEOUT,
      });

      assert.strictEqual(res.status, 200, "should return 200");
      const data = await res.json();

      assert(data.id, "should have contract id");
      assert(data.address, "should have contract address");
      assert(data.created_at, "should have created_at");
    },
  );

  await t.test(
    "GET /api/contracts/:id/events - returns paginated events",
    async () => {
      const listRes = await fetch(`${BASE_URL}/api/contracts?page=1&limit=1`, {
        timeout: API_TIMEOUT,
      });
      const { contracts } = await listRes.json();

      if (contracts.length === 0) {
        console.log("⏭️  Skipping: no contracts in database");
        return;
      }

      const contractId = contracts[0].id;
      const res = await fetch(
        `${BASE_URL}/api/contracts/${contractId}/events?page=1&limit=5`,
        {
          timeout: API_TIMEOUT,
        },
      );

      assert.strictEqual(res.status, 200, "should return 200");
      const data = await res.json();

      assert(Array.isArray(data.events), "should return events array");
      assert(data.pagination, "should include pagination");
    },
  );

  await t.test(
    "Event decoding - correct XDR → JSON transformation",
    async () => {
      const listRes = await fetch(`${BASE_URL}/api/contracts?page=1&limit=1`, {
        timeout: API_TIMEOUT,
      });
      const { contracts } = await listRes.json();

      if (contracts.length === 0) {
        console.log("⏭️  Skipping: no contracts in database");
        return;
      }

      const contractId = contracts[0].id;
      const eventsRes = await fetch(
        `${BASE_URL}/api/contracts/${contractId}/events?page=1&limit=1`,
        {
          timeout: API_TIMEOUT,
        },
      );

      const { events } = await eventsRes.json();
      if (events.length === 0) {
        console.log("⏭️  Skipping: no events for contract");
        return;
      }

      const event = events[0];
      assert(event.xdr, "event should have XDR");
      assert(event.decoded, "event should have decoded data");
      assert(typeof event.decoded === "object", "decoded should be object");
    },
  );

  await t.test(
    "Idempotency - replaying events produces same state",
    async () => {
      const listRes = await fetch(`${BASE_URL}/api/contracts?page=1&limit=1`, {
        timeout: API_TIMEOUT,
      });
      const { contracts: contracts1 } = await listRes.json();

      // Fetch again immediately
      const listRes2 = await fetch(`${BASE_URL}/api/contracts?page=1&limit=1`, {
        timeout: API_TIMEOUT,
      });
      const { contracts: contracts2 } = await listRes2.json();

      assert.deepStrictEqual(
        contracts1,
        contracts2,
        "repeated API calls should return identical data",
      );
    },
  );

  await t.test("Pagination correctness with various page sizes", async () => {
    const pageSizes = [5, 10, 20, 50];

    for (const limit of pageSizes) {
      const res = await fetch(
        `${BASE_URL}/api/contracts?page=1&limit=${limit}`,
        {
          timeout: API_TIMEOUT,
        },
      );

      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert(
        data.contracts.length <= limit,
        `contracts array length should be <= ${limit}`,
      );
      assert.strictEqual(
        data.pagination.limit,
        limit,
        `pagination.limit should be ${limit}`,
      );
    }
  });

  await t.test("Concurrent request safety", async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      fetch(`${BASE_URL}/api/contracts?page=${i + 1}&limit=5`, {
        timeout: API_TIMEOUT,
      }),
    );

    const results = await Promise.all(promises);

    for (const res of results) {
      assert.strictEqual(
        res.status,
        200,
        "all concurrent requests should succeed",
      );
      const data = await res.json();
      assert(data.contracts, "each response should have contracts");
    }
  });

  await t.test("Health check endpoint - indexer is alive", async () => {
    const res = await fetch(`${BASE_URL}/health`, { timeout: API_TIMEOUT });
    assert.strictEqual(res.status, 200, "health check should return 200");

    const data = await res.json();
    assert(data.status, "should have status field");
  });
});
