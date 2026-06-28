# Storage Performance Benchmarks

> Issue #276 — ExplorerContract ring-buffer storage benchmarks.

## Methodology

Benchmarks run as integration tests (`cargo test -p soroban-explorer-contract --test storage_bench -- --nocapture`).
Wall-clock time is measured with `std::time::Instant`.
Instruction count is estimated using a proxy model: each storage read/write ≈ 500 instructions.

**Soroban limits:**
- `MAX_INSTRUCTIONS_PER_TX` = 100,000,000
- CI threshold: < 80% = 80,000,000

## Results

| Fill level | submit_event (µs) | get_events(0,50) (µs) | get_events(mid,50) (µs) | Est. instructions |
|------------|-------------------|----------------------|-------------------------|-------------------|
| 10         | ~1,290            | ~2,282               | ~1,302                  | 26,000            |
| 50         | ~1,946            | ~12,714              | ~10,023                 | 26,000            |
| 100        | ~6,350            | ~13,249              | ~10,762                 | 26,000            |

> Timings measured on a development machine. The instruction estimate is constant because
> it depends only on the `limit` parameter (50), not the fill level — ring-buffer slots are
> addressed directly via `seq % max_events`.

## Instruction estimate formula

```
submit_event:       5 ops  × 500 =    2,500 instructions
get_events(limit): (2 + limit) × 500 instructions
get_events(50):   52 × 500      =  26,000 instructions  (0.033% of 80M threshold)
```

Both are well below the 80,000,000 instruction CI threshold.

## Running benchmarks locally

```bash
cargo test -p soroban-explorer-contract --test storage_bench -- --nocapture
```
