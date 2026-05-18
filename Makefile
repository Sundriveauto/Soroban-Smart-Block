.PHONY: build test deploy indexer frontend clean

# ── Contract ──────────────────────────────────────────────────────────────────
build:
	cargo build --release --target wasm32-unknown-unknown \
	  -p soroban-explorer-contract

test:
	cargo test -p soroban-explorer-contract

optimize:
	stellar contract optimize \
	  --wasm target/wasm32-unknown-unknown/release/soroban_explorer_contract.wasm

deploy: build optimize
	stellar contract deploy \
	  --wasm target/wasm32-unknown-unknown/release/soroban_explorer_contract.optimized.wasm \
	  --source default \
	  --network testnet

# ── Indexer ───────────────────────────────────────────────────────────────────
indexer-install:
	cd indexer && npm install

indexer:
	cd indexer && npm start

# ── Frontend ──────────────────────────────────────────────────────────────────
frontend-install:
	cd frontend && npm install

frontend:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

# ── All ───────────────────────────────────────────────────────────────────────
install: indexer-install frontend-install

dev:
	$(MAKE) -j2 indexer frontend

clean:
	cargo clean
	rm -rf frontend/dist
