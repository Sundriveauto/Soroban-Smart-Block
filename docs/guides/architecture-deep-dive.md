# Architecture deep dive

This guide explains how data flows from the Stellar network to the user's screen.
For a clickable version, open the
[interactive architecture explorer](../site/architecture.html).

## The pipeline

```
Stellar RPC / Horizon
        │  poll every few seconds (getEvents, getTransaction)
        ▼
   Indexer (Node.js)
        │  decode XDR → human text via the ABI registry
        ▼
   PostgreSQL  ──────▶  REST + WebSocket API (Express)
                                │
                                ▼
                    React Frontend (Vite + TanStack Query)
```

## Components

### Stellar network (data source)

The indexer polls Soroban RPC for contract events and Horizon for classic asset
data. This is the single source of truth; everything downstream is derived.

### Indexer (logic)

The indexer is the heart of the system. On each poll it:

1. Fetches new events since the last processed ledger.
2. Decodes raw XDR into structured values using the ABI-like metadata registry,
   falling back to heuristic decoding when a contract is not registered.
3. Formats amounts using token symbols and decimals (including SEP-41 tokens).
4. Writes decoded events to PostgreSQL.
5. Publishes new events to the WebSocket bus for live subscribers.

### PostgreSQL (data)

Stores decoded events, contract metadata, and derived analytics so the API can
answer queries quickly without re-reading the chain.

### REST + WebSocket API (logic)

An Express server exposes the decoded data:

- **REST** on `:3001` for queries over events, contracts, wallets, and tokens.
- **WebSocket** for live `event`, `vault_ratio`, and `contract_link` messages.

Optional API key authentication and per-IP rate limiting protect the endpoints.

### React frontend (presentation)

A Vite and React application using TanStack Query for data fetching. It renders
the event feed, contract and wallet pages, and decoded event detail views.

## Why this shape

- **Decoding happens once, in the indexer.** Clients never deal with raw XDR.
- **The database is a read cache of the chain.** It can be rebuilt by re-indexing.
- **The API is thin.** It serves what the indexer already decoded, which keeps
  request latency low and the frontend simple.

## Where to go next

- [Getting started](#getting-started) to run the pipeline yourself.
- [Building with the API](#building-with-the-api) to consume its output.
- The [API playground](../api/playground.html) to explore every endpoint.
