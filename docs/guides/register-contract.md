# Registering a contract

The explorer turns raw Soroban XDR into readable text by looking up ABI-like
metadata for each contract. Until a contract is registered, its events fall back
to heuristic decoding. Registering it gives precise function names, argument
labels, and token formatting.

## What metadata provides

| Without registration           | With registration                           |
| ------------------------------ | ------------------------------------------- |
| Best-effort heuristic decoding | Exact function and argument names           |
| Generic amount formatting      | Token symbol and decimals applied           |
| No contract page metadata      | Name, version, and ABI on the contract page |

## Register on-chain

The contract exposes a registry. Use the Stellar CLI to register metadata for a
contract ID:

```bash
stellar contract invoke \
  --id $EXPLORER_CONTRACT_ID \
  --source default \
  --network testnet \
  -- register_contract \
  --caller $YOUR_ADDRESS \
  --contract_id $TARGET_CONTRACT_ID \
  --meta '{ "name": "StellarSwap", "version": "1.0.0" }'
```

The relevant contract functions are:

| Function                                       | Description                           |
| ---------------------------------------------- | ------------------------------------- |
| `register_contract(caller, contract_id, meta)` | Register ABI metadata for a contract  |
| `update_contract(caller, contract_id, meta)`   | Update metadata (admin or registrant) |
| `get_contract(contract_id)`                    | Fetch the stored metadata             |

## Register through the API

The indexer also accepts metadata over HTTP, which the frontend upload flow uses:

```bash
curl -X POST http://localhost:3001/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "contract_id": "C...",
    "meta": { "name": "StellarSwap", "version": "1.0.0" }
  }'
```

## Verify the result

Fetch the contract to confirm the metadata is stored, then load a recent event to
see the improved decoding:

```bash
curl http://localhost:3001/api/contracts/C...
curl "http://localhost:3001/api/events?contract=C...&page=1"
```

A `swap` invocation should now read as a human sentence such as
"Address `GABC…` swapped 100 USDC to 98.7 XLM" rather than raw XDR.

## Next steps

- [Build with the API](#building-with-the-api) to consume the decoded events.
- See the full ABI shape in the
  [contract registry schema](https://github.com/Soroban-Smart-Block-Explorer/Soroban-Smart-Block/blob/main/indexer/src/contractRegistry.schema.json).
