# Team — Soroban Smart Block Explorer

## Why We're Building This

We've been building on Stellar since [year] and repeatedly hit the same wall: every time we
deployed a Soroban contract, there was no way for users or partners to understand what was
happening on-chain. StellarExpert shows raw XDR. Horizon shows nothing. We built internal
tooling to decode our own events — this project makes that tooling public and generalised
for the entire ecosystem.

---

## Team Members

### [Lead Engineer — Rust / Soroban]

**Role:** Smart contract architecture, Soroban SDK integration, XDR decoding  
**GitHub:** [github.com/your-handle]  
**Relevant experience:**
- [X] years building production Rust systems
- Completed [Soroban Quest / Stellar Quest] — [link to badge/proof]
- Previously deployed Soroban contracts: [list any prior contracts or link to repos]
- Prior blockchain experience: [e.g., Ethereum Solidity, Solana Anchor — if applicable]

---

### [Full-Stack Engineer — Node.js / React]

**Role:** Indexer service, REST API, React frontend, PostgreSQL  
**GitHub:** [github.com/your-handle]  
**Relevant experience:**
- [X] years building production Node.js/TypeScript services
- Experience with Stellar SDK (`@stellar/stellar-sdk`) — [link to prior work]
- Built and operated event-driven indexers for [describe prior project]
- Frontend: React, Vite, TanStack Query — [link to prior work]

---

## Why We're Qualified

- **Soroban-native:** We understand the XDR encoding, `scValToNative`, and the Soroban RPC
  event model — not just at a surface level but well enough to have already written the
  decoder in this repo.
- **Filling a real gap:** StellarExpert and Stellar.expert are excellent for classic assets
  but show raw bytes for Soroban. We've validated this pain point with [N] developers in the
  Stellar Discord who confirmed they've hit the same wall.
- **Shipping track record:** [Link to prior shipped projects, GitHub activity, or other
  evidence of execution ability.]
- **Community involvement:** Active in [Stellar Developers Discord](https://discord.gg/stellardev)
  — [Discord handle(s)].

---

## Traction & Validated Need

- **Community feedback:** Posted in `#soroban-dev` on Stellar Discord — [N] developers
  confirmed they have no readable way to inspect their own contract events in production.
- **Comparable demand:** Etherscan's contract decoder is one of its most-used features.
  Solscan on Solana built the same thing and it became the primary explorer for Solana DeFi.
  Stellar has no equivalent for Soroban.
- **Existing tooling gap:** StellarExpert ([stellar.expert](https://stellar.expert)) —
  confirmed no Soroban event decoding as of May 2026. Horizon API returns raw XDR for
  contract events with no human-readable layer.
- **Target users:** Soroban dApp developers, DeFi users on Stellar, NFT traders, and
  anyone trying to audit or understand on-chain activity.

---

> **Note for submission:** Replace all bracketed placeholders with your real information
> before submitting to SCF. Reviewers evaluate the team section heavily — concrete evidence
> of prior work and community involvement significantly improves your chances.
