# High-Frequency Exchange Simulator

A full-stack trading simulator that models a modern exchange backend: deterministic order matching, account settlement, and real-time market visibility.

## What is implemented

### Backend (`backend/`)

- Exchange matching engine with **price-time priority**.
- Deterministic command queue with configurable simulated latency (fair ingress).
- In-memory order books per symbol (bids/asks, depth snapshots).
- Trade execution, account updates, and reservation accounting.
- Real-time market events through SSE for live UIs and analytics consumers.
- Auth service (JWT + Redis sessions + OAuth) still available.

### Frontend (`src/`)

- React/Vite UI scaffold with authentication pages and trade page shell.
- Ready to wire into `/exchange` APIs + `/exchange/events` stream.

## Architecture snapshot

```text
Trader Clients
   ├─ REST: /exchange/orders, /exchange/orderbook/:symbol
   └─ SSE : /exchange/events
         ↓
Deterministic Ingress Queue (latency simulation)
         ↓
Matching Engine (price-time priority)
         ↓
Account Ledger + Trade Store + Analytics
```

## Run locally

```bash
# 1) Optional infra for auth module
docker-compose up -d

# 2) Backend
cd backend
npm install
npm run build
npm run dev

# 3) Frontend (new terminal from repo root)
npm install
npm run dev
```

## Priority next upgrades

1. Persist exchange state (orders/trades/accounts) to PostgreSQL.
2. Redis pub/sub fanout for horizontally scaled event broadcasting.
3. WebSocket transport alongside SSE.
4. Performance benchmark suite (throughput, p99 latency, determinism checks).
5. Full UI trading terminal (depth ladder, tape, positions, PnL).
