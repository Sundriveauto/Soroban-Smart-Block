# ADR-002: ABI registry design

- **Title:** Use a compact ABI-like registry instead of a full ABI standard
- **Status:** Accepted
- **Context:** The explorer needs enough metadata to render human-readable descriptions for contract calls and events, but it does not need the full generality of a complete ABI implementation. A full ABI standard is useful for smart-contract tooling, but on-chain storage of rich ABI payloads is expensive and adds complexity for both the contract and the indexer. The repository already models metadata as a small registry with function and parameter definitions in [contracts/explorer/src/lib.rs](../../contracts/explorer/src/lib.rs).
- **Decision:** Use a lightweight, contract-native registry centered on `ContractMeta`, `FunctionAbi`, and `ParamDef` rather than a full ABI schema. Contracts register metadata with `register_contract` and `update_contract`, and the explorer reads that metadata through `get_contract`. The registry focuses on the fields needed to explain function names, parameter kinds, and descriptions, which is enough for the UI and for decoding workflows without carrying the full machinery of a general ABI implementation.
- **Consequences:** This keeps the on-chain metadata small, cheap to store, and easy to reason about. It also makes the contract surface area smaller and lets the indexer treat metadata as a simple lookup table. The tradeoff is that the format is intentionally opinionated and not a perfect substitute for a full ABI consumer ecosystem.
- **Rejected alternatives:**
  - Full ABI standard as the sole source of truth: more interoperable with existing tooling, but significantly heavier to store and maintain on-chain.
  - Store only raw contract IDs and rely entirely on the frontend to infer schemas: too weak for human-readable decoding and would push the burden to every client.
  - Keep metadata entirely off-chain: simpler for the contract but makes the explorer depend on external state and complicates verification and cross-instance consistency.
