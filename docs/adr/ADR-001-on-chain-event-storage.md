# ADR-001: On-chain event storage

- **Title:** Store decoded events on-chain in the explorer contract
- **Status:** Accepted
- **Context:** The explorer needs a durable, authoritative record of decoded events that survives indexer restarts, replays, and partial outages. The contract already exposes event retrieval APIs such as `get_event`, `get_events`, and `event_count`, so storing the decoded log in the contract gives contributors a single source of truth rather than a hidden side channel in PostgreSQL. An off-chain-only design would make the event history harder to verify and would weaken the guarantee that the decoded record is the same record users inspect.
- **Decision:** Keep decoded events on-chain inside the explorer contract by using the ring-buffer storage model implemented in [contracts/explorer/src/lib.rs](../../contracts/explorer/src/lib.rs). The off-chain indexer submits decoded events through `submit_event`, the contract assigns a monotonic sequence number, and clients can later read them back through `get_event` and `get_events`. PostgreSQL remains a secondary operational store for indexing, filtering, and search, but the contract is the canonical event log.
- **Consequences:** This makes the history durable, replayable, and inspectable without depending on a single database instance. It also gives us a clear sequence model and makes storage-cap behavior explicit through the ring buffer. The tradeoff is that on-chain storage is more expensive and less flexible than a normal relational table, so we only persist the minimal decoded event payload needed for inspection.
- **Rejected alternatives:**
  - Pure off-chain storage in PostgreSQL only: simpler to write but would make the event history dependent on a single database and would make replay semantics less transparent.
  - Store only raw event bytes on-chain: preserves the original data but fails the product goal of exposing human-readable decoded history.
  - Use external object storage or IPFS for the decoded log: avoids on-chain costs but breaks the requirement for a verifiable, contract-native history and makes the explorer dependent on a third-party system.
