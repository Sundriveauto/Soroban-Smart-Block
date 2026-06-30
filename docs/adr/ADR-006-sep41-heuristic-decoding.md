# ADR-006: SEP-41 heuristic decoding

- **Title:** Use SEP-41 event extraction and heuristic fallback when no registered ABI exists
- **Status:** Accepted
- **Context:** Many contracts do not have a registered ABI, yet the explorer still needs to produce useful descriptions for common token-style events. The indexer already contains a dedicated SEP-41 extractor in [indexer/src/sep41.js](../../indexer/src/sep41.js) and a general heuristic parser in [indexer/src/heuristicParser.js](../../indexer/src/heuristicParser.js). The decoder in [indexer/src/decoder.js](../../indexer/src/decoder.js) uses those components to decide whether to use a registered ABI, a token-specific parser, or a best-effort heuristic.
- **Decision:** Prefer registered ABI metadata when it is available. When no ABI is registered, attempt SEP-41-style extraction for transfer, mint, burn, approve, and clawback patterns. If that does not match, fall back to heuristic decoding that guesses likely parameter types from the raw values. This gives reasonable output for common token contracts while preserving a clear path to more accurate decoding when ABI metadata is later supplied.
- **Consequences:** Users get meaningful output even for unregistered contracts, and the system can recognize common token flows without requiring a full ABI. The downside is that heuristic output is probabilistic rather than authoritative, so the UI should clearly distinguish it from ABI-backed descriptions when appropriate.
- **Rejected alternatives:**
  - Require a registered ABI for every contract before displaying anything: maximally accurate but too restrictive for early adopters and for public contracts that have no curated metadata.
  - Attempt only heuristic parsing and ignore SEP-41 structure: less precise for token events and more error-prone for common transfer patterns.
  - Build a custom parser for every contract family: too much maintenance burden and not scalable across the ecosystem.
