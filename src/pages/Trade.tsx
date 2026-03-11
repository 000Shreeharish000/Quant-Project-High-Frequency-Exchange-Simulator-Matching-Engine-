import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

interface DepthPoint {
  price: number;
  cumulativeQty: number;
}

const numberOrDash = (value: number | null, digits = 2): string => {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
};

const buildDepthPoints = (levels: OrderBookLevel[]): DepthPoint[] => {
  let running = 0;
  return levels.map((level) => {
    running += level.quantity;
    return {
      price: level.price,
      cumulativeQty: running,
    };
  });
};

const Trade = () => {
  const [symbolInput, setSymbolInput] = useState("BTCUSD");
  const [activeSymbol, setActiveSymbol] = useState("BTCUSD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestId = useRef(0);

  const [orderBook, setOrderBook] = useState<OrderBookSnapshot | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<SymbolAnalytics | null>(null);
  const [stats, setStats] = useState<EngineStats | null>(null);

  const normalizedInput = useMemo(() => symbolInput.trim().toUpperCase() || "BTCUSD", [symbolInput]);

  const maxBookQty = useMemo(() => {
    const levels = [...(orderBook?.bids ?? []), ...(orderBook?.asks ?? [])];
    return levels.reduce((max, level) => Math.max(max, level.quantity), 0);
  }, [orderBook]);

  const tradeChartData = useMemo(() => {
    const ordered = [...trades].reverse();
    const maxQty = ordered.reduce((max, t) => Math.max(max, t.quantity), 0);
    const priceMin = ordered.reduce((min, t) => Math.min(min, t.price), Number.POSITIVE_INFINITY);
    const priceMax = ordered.reduce((max, t) => Math.max(max, t.price), Number.NEGATIVE_INFINITY);

    return {
      points: ordered.map((trade, index) => ({
        ...trade,
        index,
        widthPct: maxQty > 0 ? (trade.quantity / maxQty) * 100 : 0,
      })),
      priceMin: Number.isFinite(priceMin) ? priceMin : null,
      priceMax: Number.isFinite(priceMax) ? priceMax : null,
    };
  }, [trades]);

  const depthData = useMemo(() => {
    const bidPoints = buildDepthPoints(orderBook?.bids ?? []);
    const askPoints = buildDepthPoints(orderBook?.asks ?? []);
    const maxDepth = Math.max(
      ...bidPoints.map((p) => p.cumulativeQty),
      ...askPoints.map((p) => p.cumulativeQty),
      0
    );
    return { bidPoints, askPoints, maxDepth };
  }, [orderBook]);

  const fetchMarketData = useCallback(async (targetSymbol: string) => {
    const requestId = ++lastRequestId.current;
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

      if (requestId !== lastRequestId.current) {
        return;
      }

      setOrderBook(orderBookRes.data ?? null);
      setTrades(tradesRes.data ?? []);
      setAnalytics(analyticsRes.data ?? null);
      setStats(statsRes.data ?? null);
    } catch (fetchError) {
      if (requestId !== lastRequestId.current) {
        return;
      }
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch exchange data");
    } finally {
      if (requestId === lastRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchMarketData(activeSymbol);
    const timer = window.setInterval(() => fetchMarketData(activeSymbol), 5000);
    return () => window.clearInterval(timer);
  }, [activeSymbol, fetchMarketData]);

  const applySymbol = () => {
    setActiveSymbol(normalizedInput);
    setSymbolInput(normalizedInput);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Trading Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live market overview for the matching engine simulator.</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase().replace(/\s+/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applySymbol();
                }
              }}
              placeholder="Symbol (e.g. BTCUSD)"
              className="h-10 border bg-background px-3 text-sm"
            />
            <button
              onClick={applySymbol}
              className="h-10 bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Apply Symbol
            </button>
            <button
              onClick={() => fetchMarketData(activeSymbol)}
              disabled={loading}
              className="h-10 border px-4 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <Link to="/" className="text-sm text-primary hover:underline">
              Back
            </Link>
          </div>
        </div>

        {error && <div className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="grid gap-4 md:grid-cols-4">
          <Metric title="Mid Price" value={numberOrDash(analytics?.midPrice ?? null)} />
          <Metric title="Spread" value={numberOrDash(analytics?.spread ?? null)} />
          <Metric title="Last Trade" value={numberOrDash(analytics?.lastTradePrice ?? null)} />
          <Metric title="Engine Queue" value={`${stats?.queueDepth ?? 0}`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="border bg-card p-4 lg:col-span-2">
            <h2 className="mb-3 font-semibold">Order Book ({activeSymbol})</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="mb-2 font-medium text-emerald-400">Bids</p>
                <div className="space-y-1">
                  {(orderBook?.bids ?? []).map((level) => (
                    <div key={`bid-${level.price}`} className="relative overflow-hidden border px-2 py-1">
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-500/20"
                        style={{ width: `${maxBookQty > 0 ? (level.quantity / maxBookQty) * 100 : 0}%` }}
                      />
                      <div className="relative z-10 flex justify-between">
                        <span>{level.price.toFixed(2)}</span>
                        <span>{level.quantity.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 font-medium text-rose-400">Asks</p>
                <div className="space-y-1">
                  {(orderBook?.asks ?? []).map((level) => (
                    <div key={`ask-${level.price}`} className="relative overflow-hidden border px-2 py-1">
                      <div
                        className="absolute inset-y-0 right-0 bg-rose-500/20"
                        style={{ width: `${maxBookQty > 0 ? (level.quantity / maxBookQty) * 100 : 0}%` }}
                      />
                      <div className="relative z-10 flex justify-between">
                        <span>{level.price.toFixed(2)}</span>
                        <span>{level.quantity.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border bg-card p-4">
            <h2 className="mb-3 font-semibold">Recent Trades</h2>
            <div className="space-y-2 text-sm">
              {trades.length === 0 && <p className="text-muted-foreground">No recent trades.</p>}
              {trades.map((trade) => (
                <div key={trade.id} className="border px-2 py-1">
                  <div className="flex items-center justify-between">
                    <span className={trade.aggressorSide === "buy" ? "text-emerald-400" : "text-rose-400"}>
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

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border bg-card p-4">
            <h2 className="mb-4 font-semibold">Trade Size Visualization</h2>
            <div className="space-y-2">
              {tradeChartData.points.length === 0 && <p className="text-sm text-muted-foreground">No trade data yet.</p>}
              {tradeChartData.points.map((trade) => (
                <div key={`chart-${trade.id}`} className="grid grid-cols-[84px_1fr_84px] items-center gap-2 text-xs">
                  <span className={trade.aggressorSide === "buy" ? "text-emerald-400" : "text-rose-400"}>
                    {new Date(trade.executedAt).toLocaleTimeString()}
                  </span>
                  <div className="h-4 border bg-muted">
                    <div
                      className={trade.aggressorSide === "buy" ? "h-full bg-emerald-500" : "h-full bg-rose-500"}
                      style={{ width: `${trade.widthPct}%` }}
                    />
                  </div>
                  <span className="text-right text-muted-foreground">{trade.quantity.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border bg-card p-4">
            <h2 className="mb-4 font-semibold">Liquidity Balance</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Bid Liquidity</span>
                  <span>{numberOrDash(analytics?.totalBidLiquidity ?? null, 4)}</span>
                </div>
                <div className="h-5 border bg-muted">
                  <div
                    className="h-full bg-cyan-500"
                    style={{
                      width: `${
                        (analytics?.totalBidLiquidity ?? 0) + (analytics?.totalAskLiquidity ?? 0) > 0
                          ? ((analytics?.totalBidLiquidity ?? 0) /
                              ((analytics?.totalBidLiquidity ?? 0) + (analytics?.totalAskLiquidity ?? 0))) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Ask Liquidity</span>
                  <span>{numberOrDash(analytics?.totalAskLiquidity ?? null, 4)}</span>
                </div>
                <div className="h-5 border bg-muted">
                  <div
                    className="h-full bg-orange-500"
                    style={{
                      width: `${
                        (analytics?.totalBidLiquidity ?? 0) + (analytics?.totalAskLiquidity ?? 0) > 0
                          ? ((analytics?.totalAskLiquidity ?? 0) /
                              ((analytics?.totalBidLiquidity ?? 0) + (analytics?.totalAskLiquidity ?? 0))) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="border p-2">
                  <p className="text-xs text-muted-foreground">VWAP</p>
                  <p className="font-semibold">{numberOrDash(analytics?.vwap ?? null)}</p>
                </div>
                <div className="border p-2">
                  <p className="text-xs text-muted-foreground">Avg Latency</p>
                  <p className="font-semibold">{numberOrDash(analytics?.averageExecutionLatencyMs ?? null, 3)} ms</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border bg-card p-4">
            <h2 className="mb-2 font-semibold">Cumulative Depth Profile</h2>
            <p className="mb-3 text-xs text-muted-foreground">Cumulative quantity by price level for bid/ask sides.</p>
            <div className="space-y-2">
              {depthData.bidPoints.map((point) => (
                <div key={`depth-buy-${point.price}`} className="grid grid-cols-[80px_1fr_72px] items-center gap-2 text-xs">
                  <span className="text-emerald-400">{point.price.toFixed(2)}</span>
                  <div className="h-3 border bg-muted">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${depthData.maxDepth > 0 ? (point.cumulativeQty / depthData.maxDepth) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-right text-muted-foreground">{point.cumulativeQty.toFixed(3)}</span>
                </div>
              ))}
              {depthData.askPoints.map((point) => (
                <div key={`depth-sell-${point.price}`} className="grid grid-cols-[80px_1fr_72px] items-center gap-2 text-xs">
                  <span className="text-rose-400">{point.price.toFixed(2)}</span>
                  <div className="h-3 border bg-muted">
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${depthData.maxDepth > 0 ? (point.cumulativeQty / depthData.maxDepth) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-right text-muted-foreground">{point.cumulativeQty.toFixed(3)}</span>
                </div>
              ))}
              {depthData.bidPoints.length === 0 && depthData.askPoints.length === 0 && (
                <p className="text-xs text-muted-foreground">No depth data yet.</p>
              )}
            </div>
          </div>

          <div className="border bg-card p-4">
            <h2 className="mb-2 font-semibold">Trade Price Timeline</h2>
            <p className="mb-3 text-xs text-muted-foreground">Recent trade prices with side-colored markers.</p>
            <div className="relative h-40 border bg-muted/30">
              {tradeChartData.points.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  No timeline data yet.
                </div>
              )}
              {tradeChartData.points.map((point, index) => {
                const xPct = tradeChartData.points.length > 1 ? (index / (tradeChartData.points.length - 1)) * 100 : 0;
                const range =
                  tradeChartData.priceMax !== null && tradeChartData.priceMin !== null
                    ? tradeChartData.priceMax - tradeChartData.priceMin
                    : 0;
                const normalized =
                  range > 0 && tradeChartData.priceMin !== null ? (point.price - tradeChartData.priceMin) / range : 0.5;
                const yPct = 100 - normalized * 100;

                return (
                  <div
                    key={`timeline-point-${point.id}`}
                    className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 border ${
                      point.aggressorSide === "buy" ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    style={{ left: `${xPct}%`, top: `${yPct}%` }}
                    title={`${point.price.toFixed(2)} @ ${new Date(point.executedAt).toLocaleTimeString()}`}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>{tradeChartData.priceMax !== null ? `High ${tradeChartData.priceMax.toFixed(2)}` : "High —"}</span>
              <span>{tradeChartData.priceMin !== null ? `Low ${tradeChartData.priceMin.toFixed(2)}` : "Low —"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric = ({ title, value }: { title: string; value: string }) => (
  <div className="border bg-card p-4">
    <p className="text-xs text-muted-foreground">{title}</p>
    <p className="text-xl font-semibold text-card-foreground">{value}</p>
  </div>
);

export default Trade;
