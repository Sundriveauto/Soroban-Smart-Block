# ADR-004: PostgreSQL schema

- **Title:** Use PostgreSQL as the canonical relational store
- **Status:** Accepted
- **Context:** The explorer needs relational filtering, durable storage, and search-friendly queries over decoded events. The indexer already uses a SQL schema and migrations under [indexer/migrations](../../indexer/migrations) with a database layer in [indexer/src/db.js](../../indexer/src/db.js). SQLite would be attractive for local development but is a weaker fit for concurrent indexing workers and multi-process deployments. MongoDB and time-series databases would make relational queries and full-text search more awkward than the SQL model already used by the project.
- **Decision:** Use PostgreSQL as the canonical and operational store for indexed events, contract metadata, and supporting tables. The schema is versioned with migrations, and the indexer uses SQL queries for filtering, pagination, and search. This choice keeps the data model explicit and matches the project’s need for joins, filtering, and later analytics.
- **Consequences:** PostgreSQL adds operational overhead compared to a file-based database, but it provides the durability, indexing, and query flexibility we need. It also makes it easier to evolve the schema as the explorer grows without introducing custom application-layer data structures.
- **Rejected alternatives:**
  - SQLite: simpler to run locally, but weaker for concurrent multi-process indexing and less appropriate for production deployments.
  - MongoDB: flexible document storage but less natural for the relational filtering and search patterns the explorer already relies on.
  - Time-series databases: useful for metrics, but not a good fit for the event and contract metadata model that requires structured joins and full-text search.
