import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import { OrderBook } from "../domain/OrderBook.js";
import {
  AccountState,
  CreateOrderRequest,
  EngineEvent,
  EngineStats,
  Order,
  Side,
  SymbolAnalytics,
  Trade,
} from "../domain/types.js";

interface QueuedCommand {
  id: string;
  submittedAt: number;
  effectiveAt: number;
  sequence: number;
  type: "place_order";
  payload: CreateOrderRequest;
  resolve: (value: { accepted: boolean; reason?: string; order?: Order; trades?: Trade[] }) => void;
}

interface EngineOptions {
  minLatencyMs: number;
  maxLatencyMs: number;
  maxTradesPerSymbol: number;
}

const DEFAULT_OPTIONS: EngineOptions = {
  minLatencyMs: 2,
  maxLatencyMs: 15,
  maxTradesPerSymbol: 2000,
};

export class MatchingEngine {
  private readonly books = new Map<string, OrderBook>();
  private readonly accounts = new Map<string, AccountState>();
  private readonly openOrders = new Map<string, Order>();
  private readonly orderHistory = new Map<string, Order>();
  private readonly tradesBySymbol = new Map<string, Trade[]>();
  private readonly queue: QueuedCommand[] = [];
  private readonly emitter = new EventEmitter();

  private flushTimer: NodeJS.Timeout | null = null;
  private sequence = 0;

  constructor(private readonly options: EngineOptions = DEFAULT_OPTIONS) {
    if (options.minLatencyMs < 0 || options.maxLatencyMs < 0) {
      throw new Error("Engine latency configuration cannot be negative");
    }
    if (options.maxTradesPerSymbol <= 0) {
      throw new Error("Engine trade history limit must be positive");
    }
  }

  onEvent(listener: (event: EngineEvent) => void): () => void {
    this.emitter.on("event", listener);
    return () => this.emitter.off("event", listener);
  }

  createOrUpdateAccount(traderId: string, cashDelta: number): AccountState | null {
    const account = this.ensureAccount(traderId);
    const nextCash = account.cash + cashDelta;

    if (nextCash < account.reservedCash) {
      return null;
    }

    account.cash = nextCash;
    account.updatedAt = new Date().toISOString();
    this.accounts.set(traderId, account);
    return structuredClone(account);
  }

  getAccount(traderId: string): AccountState | null {
    const account = this.accounts.get(traderId);
    return account ? structuredClone(account) : null;
  }

  async enqueueOrder(request: CreateOrderRequest): Promise<{ accepted: boolean; reason?: string; order?: Order; trades?: Trade[] }> {
    return new Promise((resolve) => {
      const now = Date.now();
      const sequence = ++this.sequence;
      const effectiveAt = now + this.sampleLatencyMs();

      this.queue.push({
        id: randomUUID(),
        submittedAt: now,
        effectiveAt,
        sequence,
        type: "place_order",
        payload: request,
        resolve,
      });

      this.queue.sort((a, b) => {
        if (a.effectiveAt === b.effectiveAt) {
          return a.sequence - b.sequence;
        }
        return a.effectiveAt - b.effectiveAt;
      });

      this.scheduleFlush();
    });
  }

  cancelOrder(orderId: string, traderId: string): { cancelled: boolean; reason?: string; order?: Order } {
    const order = this.openOrders.get(orderId);
    if (!order) {
      return { cancelled: false, reason: "Order does not exist or is already closed" };
    }
    if (order.traderId !== traderId) {
      return { cancelled: false, reason: "Order ownership mismatch" };
    }

    const book = this.ensureBook(order.symbol);
    book.remove(order);
    order.status = "cancelled";
    order.updatedAt = new Date().toISOString();

    this.releaseReservation(order, order.remainingQuantity);
    this.openOrders.delete(order.id);
    this.orderHistory.set(order.id, structuredClone(order));

    this.emit({ type: "order_cancelled", payload: order, timestamp: new Date().toISOString() });
    this.emit({ type: "book_updated", payload: book.snapshot(), timestamp: new Date().toISOString() });

    return { cancelled: true, order: structuredClone(order) };
  }

  getOrderBook(symbol: string, depth = 20) {
    const normalizedDepth = Math.max(1, Math.floor(depth));
    return this.ensureBook(symbol).snapshot(normalizedDepth);
  }

  getTrades(symbol: string, limit = 100): Trade[] {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const trades = this.tradesBySymbol.get(normalizedSymbol) ?? [];
    const normalizedLimit = Math.max(1, Math.floor(limit));
    return trades.slice(-normalizedLimit).map((trade) => structuredClone(trade));
  }

  getStats(): EngineStats {
    const tradesBySymbol: Record<string, number> = {};
    let tradeCount = 0;

    for (const [symbol, trades] of this.tradesBySymbol.entries()) {
      tradesBySymbol[symbol] = trades.length;
      tradeCount += trades.length;
    }

    return {
      queueDepth: this.queue.length,
      openOrderCount: this.openOrders.size,
      historicalOrderCount: this.orderHistory.size,
      accountCount: this.accounts.size,
      symbolCount: this.books.size,
      tradeCount,
      tradesBySymbol,
      timestamp: new Date().toISOString(),
    };
  }

  getAnalytics(symbol: string): SymbolAnalytics {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const book = this.ensureBook(normalizedSymbol);
    const snapshot = book.snapshot(10);
    const trades = this.tradesBySymbol.get(normalizedSymbol) ?? [];
    const totalBidLiquidity = snapshot.bids.reduce((sum, level) => sum + level.quantity, 0);
    const totalAskLiquidity = snapshot.asks.reduce((sum, level) => sum + level.quantity, 0);

    const bestBidQty = snapshot.bids[0]?.quantity ?? 0;
    const bestAskQty = snapshot.asks[0]?.quantity ?? 0;
    const denominator = bestBidQty + bestAskQty;

    const totalTradeQty = trades.reduce((sum, trade) => sum + trade.quantity, 0);
    const totalTradeNotional = trades.reduce((sum, trade) => sum + trade.quantity * trade.price, 0);
    const totalLatency = trades.reduce((sum, trade) => sum + trade.latencyMs, 0);

    return {
      symbol: normalizedSymbol,
      spread: snapshot.spread,
      midPrice:
        snapshot.bestBid !== null && snapshot.bestAsk !== null
          ? (snapshot.bestBid + snapshot.bestAsk) / 2
          : null,
      totalBidLiquidity,
      totalAskLiquidity,
      topOfBookImbalance: denominator > 0 ? (bestBidQty - bestAskQty) / denominator : null,
      vwap: totalTradeQty > 0 ? totalTradeNotional / totalTradeQty : null,
      lastTradePrice: trades.length > 0 ? trades[trades.length - 1].price : null,
      tradeCount: trades.length,
      averageExecutionLatencyMs: trades.length > 0 ? totalLatency / trades.length : 0,
      timestamp: new Date().toISOString(),
    };
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null || this.queue.length === 0) {
      return;
    }

    const next = this.queue[0];
    const waitMs = Math.max(0, next.effectiveAt - Date.now());
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushQueue();
    }, waitMs);
  }

  private flushQueue(): void {
    const now = Date.now();
    const readyCommands: QueuedCommand[] = [];

    while (this.queue.length > 0) {
      const next = this.queue[0];
      if (next.effectiveAt > now) {
        break;
      }
      readyCommands.push(this.queue.shift() as QueuedCommand);
    }

    for (const command of readyCommands) {
      const result = this.processPlaceOrder(command.payload, command.submittedAt);
      command.resolve(result);
    }

    this.scheduleFlush();
  }

  private processPlaceOrder(
    request: CreateOrderRequest,
    submittedAt: number
  ): { accepted: boolean; reason?: string; order?: Order; trades?: Trade[] } {
    const account = this.ensureAccount(request.traderId);

    if (request.price <= 0 || request.quantity <= 0) {
      return { accepted: false, reason: "Price and quantity must be positive" };
    }

    const order: Order = {
      id: randomUUID(),
      clientOrderId: request.clientOrderId,
      traderId: request.traderId,
      symbol: this.normalizeSymbol(request.symbol),
      side: request.side,
      type: "limit",
      price: request.price,
      quantity: request.quantity,
      remainingQuantity: request.quantity,
      status: "open",
      timeInForce: request.timeInForce ?? "gtc",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sequence: ++this.sequence,
    };

    const reserveOk = this.reserveForOrder(account, order);
    if (!reserveOk) {
      order.status = "rejected";
      this.orderHistory.set(order.id, structuredClone(order));
      this.emit({
        type: "order_rejected",
        payload: { order, reason: "Insufficient available balance" },
        timestamp: new Date().toISOString(),
      });
      return { accepted: false, reason: "Insufficient available balance" };
    }

    const book = this.ensureBook(order.symbol);
    const trades: Trade[] = [];

    while (order.remainingQuantity > 0) {
      const restingOrder = book.peekBestOpposing(order);
      if (!restingOrder) {
        break;
      }

      const tradeQty = Math.min(order.remainingQuantity, restingOrder.remainingQuantity);
      const tradePrice = restingOrder.price;
      const executedAt = new Date().toISOString();

      order.remainingQuantity -= tradeQty;
      restingOrder.remainingQuantity -= tradeQty;
      order.updatedAt = executedAt;
      restingOrder.updatedAt = executedAt;

      const buyOrder = order.side === "buy" ? order : restingOrder;
      const sellOrder = order.side === "sell" ? order : restingOrder;

      this.applyTradeSettlement(buyOrder, sellOrder, tradeQty, tradePrice);

      const trade: Trade = {
        id: randomUUID(),
        symbol: order.symbol,
        price: tradePrice,
        quantity: tradeQty,
        buyOrderId: buyOrder.id,
        sellOrderId: sellOrder.id,
        buyerId: buyOrder.traderId,
        sellerId: sellOrder.traderId,
        aggressorSide: order.side,
        executedAt,
        latencyMs: Date.now() - submittedAt,
      };
      trades.push(trade);

      if (restingOrder.remainingQuantity === 0) {
        const restingSide: Side = restingOrder.side;
        const removed = book.shiftBestOrder(restingSide, restingOrder.price);
        if (removed) {
          removed.status = "filled";
          this.openOrders.delete(removed.id);
          this.orderHistory.set(removed.id, structuredClone(removed));
        }
      } else {
        restingOrder.status = "partially_filled";
      }
    }

    if (order.remainingQuantity === 0) {
      order.status = "filled";
      this.orderHistory.set(order.id, structuredClone(order));
    } else if (order.timeInForce === "ioc") {
      order.status = order.remainingQuantity < order.quantity ? "partially_filled" : "cancelled";
      this.releaseReservation(order, order.remainingQuantity);
      this.orderHistory.set(order.id, structuredClone(order));
    } else {
      order.status = order.remainingQuantity < order.quantity ? "partially_filled" : "open";
      book.add(order);
      this.openOrders.set(order.id, order);
    }

    const symbolTrades = this.tradesBySymbol.get(order.symbol) ?? [];
    symbolTrades.push(...trades);
    if (symbolTrades.length > this.options.maxTradesPerSymbol) {
      const excess = symbolTrades.length - this.options.maxTradesPerSymbol;
      symbolTrades.splice(0, excess);
    }
    this.tradesBySymbol.set(order.symbol, symbolTrades);

    this.emit({ type: "order_accepted", payload: order, timestamp: new Date().toISOString() });
    for (const trade of trades) {
      this.emit({ type: "trade_executed", payload: trade, timestamp: trade.executedAt });
    }
    this.emit({ type: "book_updated", payload: book.snapshot(), timestamp: new Date().toISOString() });

    return {
      accepted: true,
      order: structuredClone(order),
      trades,
    };
  }

  private reserveForOrder(account: AccountState, order: Order): boolean {
    if (order.side === "buy") {
      const requiredCash = order.price * order.quantity;
      const availableCash = account.cash - account.reservedCash;
      if (availableCash < requiredCash) {
        return false;
      }
      account.reservedCash += requiredCash;
      account.updatedAt = new Date().toISOString();
      return true;
    }

    const currentPosition = account.positions[order.symbol] ?? 0;
    const reservedPosition = account.reservedPositions[order.symbol] ?? 0;
    const availablePosition = currentPosition - reservedPosition;
    if (availablePosition < order.quantity) {
      return false;
    }

    account.reservedPositions[order.symbol] = reservedPosition + order.quantity;
    account.updatedAt = new Date().toISOString();
    return true;
  }

  private applyTradeSettlement(buyOrder: Order, sellOrder: Order, quantity: number, price: number): void {
    const notional = quantity * price;
    const buyer = this.ensureAccount(buyOrder.traderId);
    const seller = this.ensureAccount(sellOrder.traderId);

    const buyerReservedForPrice = buyOrder.price * quantity;
    buyer.reservedCash = Math.max(0, buyer.reservedCash - buyerReservedForPrice);
    buyer.cash -= notional;
    buyer.positions[buyOrder.symbol] = (buyer.positions[buyOrder.symbol] ?? 0) + quantity;
    buyer.updatedAt = new Date().toISOString();

    seller.reservedPositions[sellOrder.symbol] = Math.max(
      0,
      (seller.reservedPositions[sellOrder.symbol] ?? 0) - quantity
    );
    seller.positions[sellOrder.symbol] = (seller.positions[sellOrder.symbol] ?? 0) - quantity;
    seller.cash += notional;
    seller.updatedAt = new Date().toISOString();

    this.accounts.set(buyer.traderId, buyer);
    this.accounts.set(seller.traderId, seller);
  }

  private releaseReservation(order: Order, quantity: number): void {
    const account = this.ensureAccount(order.traderId);
    if (order.side === "buy") {
      account.reservedCash = Math.max(0, account.reservedCash - order.price * quantity);
    } else {
      account.reservedPositions[order.symbol] = Math.max(
        0,
        (account.reservedPositions[order.symbol] ?? 0) - quantity
      );
    }
    account.updatedAt = new Date().toISOString();
  }


  private normalizeSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
  }

  private ensureBook(symbol: string): OrderBook {
    const normalized = this.normalizeSymbol(symbol);
    const existing = this.books.get(normalized);
    if (existing) {
      return existing;
    }
    const created = new OrderBook(normalized);
    this.books.set(normalized, created);
    return created;
  }

  private ensureAccount(traderId: string): AccountState {
    const existing = this.accounts.get(traderId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const created: AccountState = {
      traderId,
      cash: 0,
      positions: {},
      reservedCash: 0,
      reservedPositions: {},
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.set(traderId, created);
    return created;
  }

  private emit(event: EngineEvent): void {
    this.emitter.emit("event", event);
  }

  private sampleLatencyMs(): number {
    if (this.options.maxLatencyMs <= this.options.minLatencyMs) {
      return this.options.minLatencyMs;
    }
    return (
      this.options.minLatencyMs +
      Math.floor(Math.random() * (this.options.maxLatencyMs - this.options.minLatencyMs + 1))
    );
  }
}

export const matchingEngine = new MatchingEngine();
