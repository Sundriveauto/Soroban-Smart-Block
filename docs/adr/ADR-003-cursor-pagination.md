# ADR-003: Cursor pagination

- **Title:** Use cursor-based pagination for event feeds
- **Status:** Accepted
- **Context:** Event lists grow over time, and offset-based pagination becomes increasingly expensive as the dataset grows. The repository already includes a cursor-based API in [indexer/src/db.js](../../indexer/src/db.js) and a sequence-based contract read path in [contracts/explorer/src/lib.rs](../../contracts/explorer/src/lib.rs). This design avoids expensive `OFFSET` scans and keeps pagination stable when new rows are appended.
- **Decision:** Use cursor pagination keyed by the monotonic event sequence. The indexer exposes `after_seq` as an opaque cursor in `getEventsCursor`, and the contract exposes `get_events(cursor, limit)` as a sequence-based read. Clients receive the last seen sequence and pass it back to fetch the next page; the server uses that cursor to fetch the next chunk without scanning from the beginning.
- **Consequences:** Pagination remains efficient and consistent even as the event stream grows, and it is a better fit for append-only systems than page numbers. The cost is that clients cannot jump to an arbitrary page directly and must follow the cursor chain.
- **Rejected alternatives:**
  - Offset/limit pagination with page numbers: simple to implement initially, but it degrades as the table grows and can become inconsistent as data is inserted.
  - Full-table scans for every page request: easy to reason about but unacceptable for production-scale event feeds.
  - Timestamp-based cursors: easier for humans to read but less precise and more brittle when multiple events share the same ledger or timestamp.
