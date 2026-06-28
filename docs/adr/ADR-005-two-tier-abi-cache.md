# ADR-005: Two-tier ABI cache

- **Title:** Use an LRU cache in-process plus Redis for shared cache state
- **Status:** Accepted
- **Context:** The indexer repeatedly reads the same metadata and event lists across requests. A single Redis cache would share data across instances, but it would also add network latency to every hot-path lookup and make it harder to avoid repeated work during bursts. The repository’s cache layer in [indexer/src/cacheLayer.js](../../indexer/src/cacheLayer.js) implements exactly this split: L1 is an in-process LRU cache and L2 is Redis-backed state.
- **Decision:** Use a two-tier cache strategy. L1 provides fast, local LRU storage with short TTLs for hot items; L2 provides shared Redis-backed storage for cross-instance reuse. The cache layer uses per-item TTL configuration, cache invalidation messages, and a small amount of stampede protection so that stale data is bounded and updates propagate across instances.
- **Consequences:** This design gives fast local hits while still allowing shared caches across multiple indexer workers. The cost is increased complexity around invalidation and TTL tuning, but that cost is much smaller than forcing every lookup to hit Redis or every instance to recompute the same result.
- **Rejected alternatives:**
  - Redis only: simpler to reason about as a single shared store, but too slow for the hottest paths and too expensive to use for every lookup.
  - In-process LRU only: very fast but not shared across instances and therefore poor for horizontally scaled deployments.
  - No cache at all: the smallest implementation, but it would repeatedly recompute the same metadata and event list queries under load.
