PS (Problem Statement)

Design and implement a high-performance exchange backend that accepts orders from multiple traders, maintains a fair and deterministic order book, matches orders using price-time priority, executes trades, updates accounts, and exposes real-time market data and analytics — while simulating latency and fairness constraints similar to real exchanges (NASDAQ / crypto).

In short:

Many users

Many orders

Same price ≠ same priority

Milliseconds matter

One bug = broken market

4
Step-by-step (no fluff):

Trader sends an order

Buy/Sell

Price

Quantity

Type (limit / market)

Exchange validates

Enough balance?

Order format correct?

Margin rules?

Order enters Matching Engine

Stored in in-memory order book

Sorted by price → time

Engine tries to match

Best bid ↔ best ask

FIFO at same price

Partial fills allowed

Trade executes

Trade record generated

Wallets updated

Fees applied (maker/taker)

Market updates broadcast

WebSocket price feed

Order book depth update

Trades stream

Analytics engine consumes ticks

Spread

Liquidity

Slippage

Latency metrics

That’s the loop. Thousands of times per second.

🧩 Core Components — explained properly
1️⃣ Matching Engine (THE HEART)

What it does

Maintains two books:

Bid book (buyers)

Ask book (sellers)

Always matches:

Highest bid with lowest ask

Enforces:

Price priority

Time priority (FIFO)

Example

BUY  100 @ 101 (10:00:01)
BUY  100 @ 101 (10:00:02)
SELL 150 @ 101


Execution:

First buyer gets 100

Second buyer gets 50

Second buyer still has 50 open

If you mess this up → market is unfair.

2️⃣ Order Book (In-Memory)

Data structures (important):

Price levels → sorted maps

Orders per level → queues (FIFO)

Typical structure:

Map<Price, Queue<Order>>


Why in-memory?

Databases are too slow

Matching must be deterministic and fast

Persistence happens after, asynchronously.

3️⃣ Exchange APIs

These are thin. The engine does the real work.

Endpoints:

POST /order

DELETE /order/{id}

GET /order/{id}

GET /trades

GET /orderbook

Real-time:

WebSockets for:

Trades

Top of book

Depth updates

4️⃣ Trader Accounts & Wallets

Each trader has:

Available balance

Locked balance (open orders)

P&L (realized + unrealized)

Margin simulation:

Leverage

Liquidation checks

Maintenance margin

This alone can be a separate project.

5️⃣ Market Microstructure Analytics

This is what makes interviewers pause.

You compute:

Bid-ask spread over time

Order book depth at each level

Liquidity heatmaps

Slippage vs order size

Impact cost

Uses:

Tick data (every trade)

Snapshot data (order book states)

Stored in:

ClickHouse / TimescaleDB

6️⃣ Latency & Fairness Simulation

Very advanced, very rare.

You track:

When order was received

When it entered queue

When it executed

Then simulate:

Network delay

Queue position advantage

Maker vs taker fees
