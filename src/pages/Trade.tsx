import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiClient } from "@/utils/ApiClient";

type Side = "buy" | "sell";

interface OrderBookLevel {
  price: number;
  quantity: number;
  orders: number;
}

interface OrderBookSnapshot {
  symbol: string;
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  aggressorSide: Side;
  executedAt: string;
  latencyMs: number;
}

interface SymbolAnalytics {
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

interface EngineStats {
  queueDepth: number;
  openOrderCount: number;
  historicalOrderCount: number;
  accountCount: number;
  symbolCount: number;
  tradeCount: number;
  tradesBySymbol: Record<string, number>;
  timestamp: string;
}

const numberOrDash = (value: number | null, digits = 2): string => {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
};

const Trade = () => {
  const [symbol, setSymbol] = useState("BTCUSD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderBook, setOrderBook] = useState<OrderBookSnapshot | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<SymbolAnalytics | null>(null);
  const [stats, setStats] = useState<EngineStats | null>(null);

  const activeSymbol = useMemo(() => symbol.trim().toUpperCase() || "BTCUSD", [symbol]);

  const fetchMarketData = async (targetSymbol = activeSymbol) => {
    setLoading(true);
    setError(null);

    try {
      const [orderBookRes, tradesRes, analyticsRes, statsRes] = await Promise.all([
        ApiClient.get<OrderBookSnapshot>(`/exchange/orderbook/${targetSymbol}?depth=8`),
        ApiClient.get<Trade[]>(`/exchange/trades/${targetSymbol}?limit=8`),
        ApiClient.get<SymbolAnalytics>(`/exchange/analytics/${targetSymbol}`),
        ApiClient.get<EngineStats>("/exchange/stats"),
      ]);

      if (!orderBookRes.success || !tradesRes.success || !analyticsRes.success || !statsRes.success) {
        throw new Error(
          orderBookRes.error ||
            tradesRes.error ||
            analyticsRes.error ||
            statsRes.error ||
            "Unable to load exchange data"
        );
      }

      setOrderBook(orderBookRes.data ?? null);
      setTrades(tradesRes.data ?? []);
      setAnalytics(analyticsRes.data ?? null);
      setStats(statsRes.data ?? null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch exchange data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const timer = window.setInterval(() => fetchMarketData(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Trading Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live market overview for the matching engine simulator.</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Symbol (e.g. BTCUSD)"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <button
              onClick={() => fetchMarketData()}
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <Link to="/" className="text-sm text-primary hover:underline">
              Back
            </Link>
          </div>
        </div>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Mid Price</p>
            <p className="text-xl font-semibold">{numberOrDash(analytics?.midPrice ?? null)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Spread</p>
            <p className="text-xl font-semibold">{numberOrDash(analytics?.spread ?? null)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Last Trade</p>
            <p className="text-xl font-semibold">{numberOrDash(analytics?.lastTradePrice ?? null)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Engine Queue</p>
            <p className="text-xl font-semibold">{stats?.queueDepth ?? 0}</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 lg:col-span-2">
            <h2 className="mb-3 font-semibold">Order Book ({activeSymbol})</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="mb-2 font-medium text-emerald-600">Bids</p>
                <div className="space-y-1">
                  {(orderBook?.bids ?? []).map((level) => (
                    <div key={`bid-${level.price}`} className="flex justify-between rounded bg-emerald-500/5 px-2 py-1">
                      <span>{level.price.toFixed(2)}</span>
                      <span>{level.quantity.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 font-medium text-rose-600">Asks</p>
                <div className="space-y-1">
                  {(orderBook?.asks ?? []).map((level) => (
                    <div key={`ask-${level.price}`} className="flex justify-between rounded bg-rose-500/5 px-2 py-1">
                      <span>{level.price.toFixed(2)}</span>
                      <span>{level.quantity.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-semibold">Recent Trades</h2>
            <div className="space-y-2 text-sm">
              {trades.length === 0 && <p className="text-muted-foreground">No recent trades.</p>}
              {trades.map((trade) => (
                <div key={trade.id} className="rounded border px-2 py-1">
                  <div className="flex items-center justify-between">
                    <span className={trade.aggressorSide === "buy" ? "text-emerald-600" : "text-rose-600"}>
                      {trade.aggressorSide.toUpperCase()}
                    </span>
                    <span>{trade.price.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Qty {trade.quantity.toFixed(4)} • {new Date(trade.executedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trade;
