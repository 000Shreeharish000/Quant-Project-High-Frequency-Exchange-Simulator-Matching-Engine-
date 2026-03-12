# NEXUSX: High-Frequency Exchange Simulator

A full-stack exchange simulator focused on deterministic order matching, low-latency backend behavior, and a professional operator dashboard.

---

## 1) Project Goals

- Simulate **price-time priority matching** for limit orders.
- Expose **real-time market state** (order book, trades, analytics, engine stats).
- Provide **auth-enabled web access** for trader workflows.
- Keep architecture modular so backend and UI can evolve independently.

---

## 2) System Architecture

### Frontend (Vite + React + TypeScript)
- Trading dashboard (`/trade`) with:
  - top-of-book metrics
  - order book depth ladder
  - recent trade tape
  - liquidity + trade-size visualizations
- Authentication pages (`/login`, `/signup`)
- Tailwind-based theme tuned for dark, high-contrast operator UX

### Backend (Node.js + Express + TypeScript)
- Deterministic matching engine with:
  - in-memory order books
  - simulated ingress latency queue
  - account reservation + settlement logic
  - SSE event stream for market updates
- REST API for funding, orders, cancels, book snapshots, trades, analytics, and stats

### Data/Infra
- PostgreSQL for user/auth domain persistence
- Redis for session/token support
- Docker Compose for local orchestration

---

## 3) Repository Layout

```text
.
├── src/                      # Frontend app
│   ├── pages/                # Route pages (login, signup, trade)
│   ├── components/           # Shared UI components
│   └── utils/                # API/auth client utilities
├── backend/
│   └── src/
│       ├── exchange/         # Matching engine + exchange API
│       ├── controllers/      # Auth controllers
│       ├── services/         # Auth/service layer
│       ├── middleware/       # Auth/rate limiting middleware
│       └── database/         # DB connection + init
├── docker-compose.yml
└── README.md
```

---

## 4) Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Docker + Docker Compose (recommended for full stack)

### Install dependencies

```bash
npm install
cd backend && npm install
```

### Run frontend

```bash
npm run dev
```

### Run backend

```bash
cd backend
npm run dev
```

### Optional: run infrastructure with Docker Compose

```bash
docker compose up --build
```

---

## 5) Exchange API Overview

Base route: `/exchange`

- `POST /accounts/fund` — add/remove account cash (bounded by reservations)
- `GET /accounts/:traderId` — fetch account state
- `POST /orders` — place limit order (GTC/IOC)
- `DELETE /orders/:orderId` — cancel active order
- `GET /orderbook/:symbol?depth=20` — get depth snapshot
- `GET /trades/:symbol?limit=100` — get recent trades
- `GET /analytics/:symbol` — spread, liquidity, VWAP, latency stats
- `GET /stats` — engine-level counters and queue depth
- `GET /events` — SSE stream for engine events

---

## 6) Performance Notes

- Engine ingress queue uses ordered insertion to avoid full-array re-sort on every order.
- Queue flush processes all ready commands in a single pass.
- Analytics calculations aggregate trade metrics in a single loop.
- Trade history is bounded per symbol to keep memory and response latency stable.

---

## 7) Frontend UX Principles

- Sharp rectangular surfaces (no rounded corners) for a professional terminal-like style.
- High-contrast palette with clear buy/sell differentiation.
- Compact information density for operational monitoring.
- Built-in micro visualizations to read market conditions at a glance.

---

## 8) Scripts

### Frontend
- `npm run dev` — run local dev server
- `npm run build` — production build
- `npm run test` — unit tests

### Backend
- `cd backend && npm run dev` — backend dev server
- `cd backend && npm run build` — compile TypeScript

---

## 9) Next Improvements

- Persistent order/trade storage for replay and analytics windows.
- WebSocket transport for richer real-time subscriptions.

