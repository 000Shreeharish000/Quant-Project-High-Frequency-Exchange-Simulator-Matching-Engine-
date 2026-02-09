import { Order, OrderBookLevel, OrderBookSnapshot, Side } from "./types.js";

function sortPrices(prices: number[], side: Side): number[] {
  return [...prices].sort((a, b) => (side === "buy" ? b - a : a - b));
}

export class OrderBook {
  private readonly bids = new Map<number, Order[]>();
  private readonly asks = new Map<number, Order[]>();

  constructor(public readonly symbol: string) {}

  add(order: Order): void {
    const levels = order.side === "buy" ? this.bids : this.asks;
    const queue = levels.get(order.price) ?? [];
    queue.push(order);
    levels.set(order.price, queue);
  }

  remove(order: Order): boolean {
    const levels = order.side === "buy" ? this.bids : this.asks;
    const queue = levels.get(order.price);
    if (!queue) {
      return false;
    }

    const index = queue.findIndex((existing) => existing.id === order.id);
    if (index === -1) {
      return false;
    }

    queue.splice(index, 1);
    if (queue.length === 0) {
      levels.delete(order.price);
    } else {
      levels.set(order.price, queue);
    }

    return true;
  }

  getBestPrice(side: Side): number | null {
    const levels = side === "buy" ? this.bids : this.asks;
    const prices = [...levels.keys()];
    if (prices.length === 0) {
      return null;
    }
    return sortPrices(prices, side)[0];
  }

  peekBestOpposing(order: Order): Order | null {
    const opposingSide: Side = order.side === "buy" ? "sell" : "buy";
    const levels = opposingSide === "buy" ? this.bids : this.asks;
    const prices = sortPrices([...levels.keys()], opposingSide);

    for (const price of prices) {
      const isCrossed = order.side === "buy" ? price <= order.price : price >= order.price;
      if (!isCrossed) {
        continue;
      }

      const queue = levels.get(price);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }

    return null;
  }

  shiftBestOrder(side: Side, price: number): Order | null {
    const levels = side === "buy" ? this.bids : this.asks;
    const queue = levels.get(price);
    if (!queue || queue.length === 0) {
      return null;
    }

    const next = queue.shift() ?? null;
    if (queue.length === 0) {
      levels.delete(price);
    } else {
      levels.set(price, queue);
    }

    return next;
  }

  getDepth(side: Side, depth = 10): OrderBookLevel[] {
    const levels = side === "buy" ? this.bids : this.asks;
    const prices = sortPrices([...levels.keys()], side);

    return prices.slice(0, depth).map((price) => {
      const queue = levels.get(price) ?? [];
      const quantity = queue.reduce((sum, order) => sum + order.remainingQuantity, 0);
      return {
        price,
        quantity,
        orders: queue.length,
      };
    });
  }

  snapshot(depth = 10): OrderBookSnapshot {
    const bids = this.getDepth("buy", depth);
    const asks = this.getDepth("sell", depth);
    const bestBid = bids[0]?.price ?? null;
    const bestAsk = asks[0]?.price ?? null;

    return {
      symbol: this.symbol,
      bestBid,
      bestAsk,
      spread: bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null,
      bids,
      asks,
      timestamp: new Date().toISOString(),
    };
  }
}
