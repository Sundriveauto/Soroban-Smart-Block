# Stellar Drip Wave — Project Manifest

## Project Name
Soroban Smart Block Explorer

## One-line Description
A block explorer that decodes Soroban contract calls into human-readable format on Stellar.

## Problem Statement
Stellar block explorers have excellent support for classic assets but poor support for Soroban
smart contracts. When a user calls `swap` on a DEX, explorers show raw XDR bytes — unreadable
to anyone. This "black box" experience dampens DeFi, NFT, and web3 growth on Stellar.

## Solution
Soroban Smart Block Explorer decodes contract calls on the fly using an ABI-like metadata
registry, turning opaque XDR into plain English:

> "Address GABC… swapped 100 USDC → 98.7 XLM on StellarSwap at ledger #4521983."

## Technical Stack
| Layer | Technology |
|-------|-----------|
| Smart Contract | Rust / Soroban SDK 21 |
| Indexer | Node.js 20, @stellar/stellar-sdk 12 |
| Database | PostgreSQL |
| Frontend | React 18, Vite, TanStack Query, React Router |
| Network | Stellar Testnet (Soroban RPC + Horizon) |

## Key Features
- **ABI-like registry** — any developer can register their contract's function signatures
  so the explorer knows how to decode calls.
- **SEP-41 token support** — `transfer`, `mint`, `burn` events are decoded with correct
  token symbols and amounts.
- **Wallet history** — search any Stellar address to see all Soroban interactions.
- **Function filter** — filter the event feed by function name (swap, transfer, mint…).
- **On-chain event store** — decoded events are also persisted in the Soroban contract
  itself, making them queryable without a centralised database.

## Repository Structure
```
Soroban-Smart-Block/
├── contracts/explorer/   # Soroban smart contract (Rust)
│   └── src/lib.rs
├── indexer/              # Node.js event indexer + REST API
│   └── src/
│       ├── index.js      # polls Soroban RPC
│       ├── decoder.js    # XDR → human text
│       ├── db.js         # PostgreSQL helpers
│       └── api.js        # Express REST API
├── frontend/             # React SPA
│   └── src/
│       ├── pages/        # Home, ContractPage, WalletPage, EventPage
│       └── components/   # Nav, EventTable
├── stellar.toml
├── Makefile
└── README.md
```

## How to Run
```bash
cp .env.example .env          # configure RPC + DB
make build && make deploy     # deploy contract to testnet
make install                  # install Node + React deps
make dev                      # start indexer + frontend
```

## Comparison to Existing Tools
| Tool | Classic Assets | Soroban Events |
|------|---------------|----------------|
| StellarExpert | ✅ | ❌ raw XDR |
| Stellar.expert | ✅ | ❌ raw XDR |
| **Soroban Smart Block** | ✅ | ✅ human-readable |

## License
MIT
