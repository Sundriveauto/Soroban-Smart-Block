# Team — Soroban Smart Block Explorer

## Why We're Building This

We identified this gap in 2026 while exploring the Soroban ecosystem. Every time a Soroban
contract is called, existing explorers show raw XDR bytes — unreadable to anyone. We built
this project to make Soroban activity human-readable for the entire Stellar ecosystem.

---

## Team Members

### Sunday Abel — Lead Engineer

**Role:** Smart contract architecture, Soroban SDK integration, XDR decoding, full-stack development  
**GitHub:** [github.com/sundayabel085](https://github.com/sundayabel085)  
**Relevant experience:**

- 1 year building in Rust, including this Soroban smart contract
- Built the `ExplorerContract` in this repo: ABI-like registry + on-chain event decoder
- Familiar with Soroban SDK, `scValToNative`, XDR encoding, and Soroban RPC event model
- Built the Node.js indexer, PostgreSQL schema, Express REST API, and React frontend in this project

---

## Why We're Qualified

- **Soroban-native:** Understands XDR encoding, `scValToNative`, and the Soroban RPC event
  model well enough to have written a working decoder — the code in this repo is proof.
- **Filling a real gap:** StellarExpert and Stellar.expert show raw bytes for all Soroban
  contract events. No human-readable Soroban explorer exists on Stellar as of May 2026.
- **Shipping track record:** See [github.com/sundayabel085](https://github.com/sundayabel085)
  for code history and activity.
- **Community involvement:** Active in the [Stellar Developers Discord](https://discord.gg/stellardev).

---

## Traction & Validated Need

- **Confirmed tooling gap:** StellarExpert ([stellar.expert](https://stellar.expert)) shows
  raw XDR for all Soroban contract events as of May 2026 — verified directly.
- **Community signal:** Developers in `#soroban-dev` on Stellar Discord regularly ask how to
  inspect their own contract events in a readable form. No existing tool answers this.
- **Comparable demand:** Etherscan's ABI decoder is one of its most-used features. Solscan
  built the same for Solana and became the primary Solana DeFi explorer. Stellar has no
  equivalent for Soroban — this project fills that gap.
- **Target users:** Soroban dApp developers, DeFi users, NFT traders, and auditors who need
  to understand on-chain activity without reading raw XDR.
