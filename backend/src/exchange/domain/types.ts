export type Side = "buy" | "sell";
export type OrderType = "limit";
export type TimeInForce = "gtc" | "ioc";
export type OrderStatus = "open" | "partially_filled" | "filled" | "cancelled" | "rejected";

export interface AccountState {
  traderId: string;
  cash: number;
  positions: Record<string, number>;
  reservedCash: number;
  reservedPositions: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  traderId: string;
  symbol: string;
  side: Side;
  price: number;
  quantity: number;
  timeInForce?: TimeInForce;
  clientOrderId?: string;
}

export interface Order {
  id: string;
  clientOrderId?: string;
  traderId: string;
  symbol: string;
  side: Side;
  type: OrderType;
  price: number;
  quantity: number;
  remainingQuantity: number;
  status: OrderStatus;
  timeInForce: TimeInForce;
  createdAt: string;
  updatedAt: string;
  sequence: number;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  aggressorSide: Side;
  executedAt: string;
  latencyMs: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

export interface SymbolAnalytics {
  symbol: string;
  spread: number | null;
  midPrice: number | null;
  totalBidLiquidity: number;
  totalAskLiquidity: number;
  topOfBookImbalance: number | null;
  vwap: number | null;
  lastTradePrice: number | null;
  tradeCount: number;
  averageExecutionLatencyMs: number;
  timestamp: string;
}

export interface EngineEvent {
  type: "order_accepted" | "order_rejected" | "trade_executed" | "order_cancelled" | "book_updated";
  payload: unknown;
  timestamp: string;
}
