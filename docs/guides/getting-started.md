# Getting started

This guide takes you from a fresh clone to a running explorer: the Soroban
contract, the indexer and API, and the React frontend.

## Prerequisites

- Rust with the `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
- Node.js 20 or newer
- PostgreSQL (or Docker, which provisions it for you)

## 1. Clone and configure

```bash
git clone https://github.com/Soroban-Smart-Block-Explorer/Soroban-Smart-Block
cd Soroban-Smart-Block
cp .env.example .env
```

Open `.env` and set at least `SOROBAN_RPC_URL` and `DATABASE_URL`. The defaults
target Stellar testnet and a local PostgreSQL instance.

## 2. Build and deploy the contract

```bash
make build    # compile the contract to WASM
make test     # run the contract unit tests
make deploy   # deploy to testnet and print CONTRACT_ID
```

Copy the printed contract ID into `.env` as `EXPLORER_CONTRACT_ID`.

## 3. Start the indexer and API

```bash
make indexer-install
make indexer
```

The REST API comes up on `http://localhost:3001` and the WebSocket stream on the
same host. Confirm it is healthy:

```bash
curl http://localhost:3001/api/events
```

## 4. Start the frontend

```bash
make frontend-install
make frontend
```

Open `http://localhost:5173`.

## Run everything together

```bash
make install   # install indexer and frontend dependencies
make dev        # run indexer and frontend in parallel
```

## With Docker

If you prefer containers, the full stack (including PostgreSQL) starts with:

```bash
make docker-up      # dev stack with hot reload
make docker-logs    # tail logs
make docker-down    # stop everything
```

## Next steps

- [Register a contract](#register-contract) so its events decode into plain
  English.
- [Build with the API](#building-with-the-api) from your own application.
- Explore every endpoint in the [Swagger playground](../api/playground.html).
