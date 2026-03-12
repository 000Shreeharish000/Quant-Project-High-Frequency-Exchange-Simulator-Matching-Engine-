# NEXUSX Exchange Backend

High-performance exchange simulator backend with deterministic matching, account state tracking, and real-time market streams.

## Core capabilities

- Price-time-priority matching engine (`limit` orders, `gtc` + `ioc`).
- Deterministic fairness queue with simulated exchange ingress latency.
- In-memory order books per symbol with depth snapshots.
- Trade execution + account settlement (cash, positions, reservations).
- Market analytics: spread, liquidity, imbalance, VWAP, latency.
- Real-time market event stream via Server-Sent Events (`/exchange/events`).
- Authentication module (email/password + Google OAuth + JWT) retained.

## API overview

### Exchange endpoints

- `POST /exchange/accounts/fund` – create/fund account.
- `GET /exchange/accounts/:traderId` – retrieve account snapshot.
- `POST /exchange/orders` – submit order.
- `DELETE /exchange/orders/:orderId` – cancel open order.
- `GET /exchange/orderbook/:symbol?depth=20` – order book depth.
- `GET /exchange/trades/:symbol?limit=100` – recent trades.
- `GET /exchange/analytics/:symbol` – market analytics.
- `GET /exchange/events` – SSE feed (`trade_executed`, `book_updated`, etc.).

### Auth endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/google`
- `GET /auth/google/callback`

## Quick start

```bash
# Infrastructure (optional but recommended for auth module)
docker-compose up -d

cd backend
cp .env.example .env
npm install
npm run build
npm run dev
```

> If PostgreSQL/Redis are unavailable, the exchange simulator still starts in-memory and logs warnings.
