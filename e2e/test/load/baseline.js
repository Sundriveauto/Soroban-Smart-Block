import http from "k6/http";
import { check, group } from "k6";

export const options = {
  vus: 50, // 50 virtual users
  duration: "5m", // 5 minutes

  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<2000"], // 95% < 500ms, 99% < 2s
    http_req_failed: ["rate<0.1"], // Error rate < 10%
  },
};

const BASE_URL = __ENV.INDEXER_URL || "http://localhost:3001";

/**
 * k6 Baseline Load Test
 * Target: 100 req/s sustained for 5 minutes
 * Expected: p50 < 100ms, p95 < 500ms, p99 < 2s
 */

export default function () {
  group("Contracts API", () => {
    // List contracts
    const listRes = http.get(`${BASE_URL}/api/contracts?page=1&limit=10`);
    check(listRes, {
      "list status is 200": (r) => r.status === 200,
      "list response time < 500ms": (r) => r.timings.duration < 500,
      "list has pagination": (r) => r.body.includes("pagination"),
    });

    // Get contract details (extract ID from first response if available)
    if (listRes.status === 200) {
      try {
        const data = JSON.parse(listRes.body);
        if (data.contracts && data.contracts.length > 0) {
          const contractId = data.contracts[0].id;
          const detailRes = http.get(`${BASE_URL}/api/contracts/${contractId}`);
          check(detailRes, {
            "detail status is 200": (r) => r.status === 200,
            "detail response time < 500ms": (r) => r.timings.duration < 500,
            "detail has contract data": (r) => r.body.includes('"id"'),
          });
        }
      } catch (e) {
        console.error("Failed to parse list response:", e);
      }
    }
  });

  group("Events API", () => {
    // List contracts first
    const listRes = http.get(`${BASE_URL}/api/contracts?page=1&limit=5`);

    if (listRes.status === 200) {
      try {
        const data = JSON.parse(listRes.body);
        if (data.contracts && data.contracts.length > 0) {
          const contractId = data.contracts[0].id;

          // Get events for contract
          const eventsRes = http.get(
            `${BASE_URL}/api/contracts/${contractId}/events?page=1&limit=10`,
          );
          check(eventsRes, {
            "events status is 200": (r) => r.status === 200,
            "events response time < 500ms": (r) => r.timings.duration < 500,
            "events has data": (r) => r.body.includes("events"),
          });
        }
      } catch (e) {
        console.error("Failed to parse response:", e);
      }
    }
  });

  group("Search API", () => {
    const searchRes = http.get(`${BASE_URL}/api/contracts?search=transfer`);
    check(searchRes, {
      "search status is 200 or 400": (r) =>
        r.status === 200 || r.status === 400,
      "search response time < 1000ms": (r) => r.timings.duration < 1000,
    });
  });

  group("Health Check", () => {
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
      "health status is 200": (r) => r.status === 200,
      "health response time < 100ms": (r) => r.timings.duration < 100,
    });
  });
}
