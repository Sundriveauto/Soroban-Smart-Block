# Register a Custom ABI and Watch Your Contract Events Decoded Live

This tutorial walks you through registering your own contract's ABI in the Soroban Smart Block Explorer to decode live events.

## 1. The Sample Contract
Below is a minimal Soroban DEX contract that emits `swap(caller, amount_in, token_in, amount_out, token_out)` events.

```rust
// examples/simple_dex/src/lib.rs
#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[contract]
pub struct SimpleDex;

#[contractimpl]
impl SimpleDex {
    pub fn swap(env: Env, caller: Address, amount_in: i128, token_in: Address, amount_out: i128, token_out: Address) {
        // ... swap logic ...
        env.events().publish(
            (Symbol::new(&env, "swap"), caller, token_in, token_out),
            (amount_in, amount_out),
        );
    }
}
```

## 2. Write the ABI
Create a file named `abi.json` in your `examples/simple_dex/` folder.

```json
{
  "contractId": "YOUR_CONTRACT_ID_HERE",
  "events": [
    {
      "name": "swap",
      "template": "Swap executed: {{caller}} traded {{amount_in}} of {{token_in}} for {{amount_out}} of {{token_out}}."
    }
  ]
}
```

## 3. Validate the ABI
Use the built-in Makefile to validate your ABI:
```bash
make validate-abi FILE=examples/simple_dex/abi.json
```

## 4. Register via API
Submit the ABI to the indexer API:
```bash
curl -X POST http://localhost:3001/api/contracts/YOUR_CONTRACT_ID_HERE/abi \
     -H "Content-Type: application/json" \
     -d @examples/simple_dex/abi.json
```

## 5. Deploy and Invoke
Deploy the DEX to testnet, invoke the `swap` function, and observe the decoded event on your local explorer instance!

## 6. Update the ABI
You can update the ABI by changing the template and running:
```bash
curl -X PUT http://localhost:3001/api/contracts/YOUR_CONTRACT_ID_HERE \
     -H "Content-Type: application/json" \
     -d @examples/simple_dex/abi.json
```
