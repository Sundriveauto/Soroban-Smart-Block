import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 2000 }, // Spike to 2000 vus in 10 seconds
    { duration: "30s", target: 2000 }, // Hold for 30 seconds
    { duration: "10s", target: 0 }, // Drop to 0
  ],

  thresholds: {
    http_req_duration: ["p(99)<2000"], // 99% of requests < 2s
    http_req_failed: ["rate<0.5"], // Allow higher failure rate during spike
  },
};

const BASE_URL = __ENV.INDEXER_URL || "http://localhost:3001";

/**
 * k6 Spike Test
 * Simulate sudden traffic spike: 0 → 2000 req/s in 10 seconds
 * Verifies system can handle traffic bursts without catastrophic failure
 */

export default function () {
  // Mixed request types to simulate realistic load
  const rnd = Math.random();

  let res;
  if (rnd < 0.5) {
    res = http.get(`${BASE_URL}/api/contracts?page=1&limit=10`);
  } else {
    res = http.get(`${BASE_URL}/health`);
  }

  check(res, {
    "status ok": (r) => r.status === 200,
    "response time acceptable": (r) => r.timings.duration < 2000,
  });
}
