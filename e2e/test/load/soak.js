import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 200, // 200 virtual users
  duration: "4h", // 4 hour soak test
  rampUp: "10m", // Ramp up over 10 minutes
  rampDown: "5m", // Ramp down over 5 minutes

  thresholds: {
    // Relax thresholds for long-running test
    http_req_duration: ["p(95)<1000", "p(99)<5000"],
    http_req_failed: ["rate<0.05"], // 5% failure rate acceptable
  },
};

const BASE_URL = __ENV.INDEXER_URL || "http://localhost:3001";

/**
 * k6 Soak Test
 * Sustained 200 req/s for 4 hours
 * Verifies system stability under prolonged load (memory leaks, connection pool exhaustion, etc.)
 */

export default function () {
  const res = http.get(`${BASE_URL}/api/contracts?page=1&limit=20`);

  check(res, {
    "status ok": (r) => r.status === 200,
    "response time < 1s": (r) => r.timings.duration < 1000,
    "has contracts": (r) => r.body.includes("contracts"),
  });

  // Occasionally test individual contract details
  if (Math.random() < 0.2) {
    try {
      const data = JSON.parse(res.body);
      if (data.contracts && data.contracts.length > 0) {
        const contractId =
          data.contracts[Math.floor(Math.random() * data.contracts.length)].id;
        const detailRes = http.get(
          `${BASE_URL}/api/contracts/${contractId}/events?page=1&limit=5`,
        );
        check(detailRes, {
          "detail status ok": (r) => r.status === 200,
        });
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
}
