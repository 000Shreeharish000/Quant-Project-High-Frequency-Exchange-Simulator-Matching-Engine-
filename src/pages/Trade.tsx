import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiClient } from "@/utils/ApiClient";
import AuthService from "@/utils/AuthService";

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
  const [symbolInput, setSymbolInput] = useState("BTCUSD");
  const [activeSymbol, setActiveSymbol] = useState("BTCUSD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestId = useRef(0);

  const [orderBook, setOrderBook] = useState<OrderBookSnapshot | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<SymbolAnalytics | null>(null);
  const [stats, setStats] = useState<EngineStats | null>(null);

  const userName = useMemo(() => {
    const user = AuthService.getUser();
    return user?.first_name ?? user?.email ?? "Trader";
  }, []);

  const normalizedInput = useMemo(() => symbolInput.trim().toUpperCase() || "BTCUSD", [symbolInput]);

  const fetchMarketData = useCallback(async (targetSymbol: string) => {
    const requestId = ++lastRequestId.current;
    setLoading(true);
    setError(null);

    try {
      const [orderBookRes, tradesRes, analyticsRes, statsRes] = await Promise.all([
        ApiClient.get<OrderBookSnapshot>(`/exchange/orderbook/${targetSymbol}?depth=8`),
        ApiClient.get<Trade[]>(`/exchange/trades/${targetSymbol}?limit=16`),
        ApiClient.get<SymbolAnalytics>(`/exchange/analytics/${targetSymbol}`),
        ApiClient.get<EngineStats>("/exchange/stats"),
      ]);

      if (!orderBookRes.success || !tradesRes.success || !analyticsRes.success || !statsRes.success) {
        throw new Error(
          orderBookRes.error || tradesRes.error || analyticsRes.error || statsRes.error || "Unable to load exchange data"
        );
      }

      if (requestId !== lastRequestId.current) return;

      setOrderBook(orderBookRes.data ?? null);
      setTrades(tradesRes.data ?? []);
      setAnalytics(analyticsRes.data ?? null);
      setStats(statsRes.data ?? null);
    } catch (fetchError) {
      if (requestId !== lastRequestId.current) return;
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch exchange data");
    } finally {
      if (requestId === lastRequestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData(activeSymbol);
    const timer = window.setInterval(() => fetchMarketData(activeSymbol), 4000);
    return () => window.clearInterval(timer);
  }, [activeSymbol, fetchMarketData]);

  const tradeChartData = useMemo(
    () =>
      [...trades]
        .reverse()
        .map((trade) => ({
          time: new Date(trade.executedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          price: Number(trade.price.toFixed(2)),
          quantity: Number(trade.quantity.toFixed(4)),
        })),
    [trades]
  );

  const bookDepthData = useMemo(() => {
    if (!orderBook) return [];
    const bids = orderBook.bids.map((item) => ({
      price: item.price,
      bidQty: Number(item.quantity.toFixed(4)),
      askQty: 0,
    }));
    const asks = orderBook.asks.map((item) => ({
      price: item.price,
      bidQty: 0,
      askQty: Number(item.quantity.toFixed(4)),
    }));
    return [...bids.reverse(), ...asks];
  }, [orderBook]);

  const applySymbol = () => {
    setActiveSymbol(normalizedInput);
    setSymbolInput(normalizedInput);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border bg-card/95 p-6 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Trading Command Center</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {userName}. Monitor live liquidity and execution flow.</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySymbol()}
              placeholder="Symbol (e.g. BTCUSD)"
              className="h-10 rounded-md border bg-background px-3 text-sm"
            />
            <button onClick={applySymbol} className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">Apply</button>
            <button onClick={() => fetchMarketData(activeSymbol)} className="h-10 rounded-md border px-4 text-sm font-medium hover:bg-accent">{loading ? "Refreshing..." : "Refresh"}</button>
            <button onClick={() => { AuthService.logout(); window.location.href = "/login"; }} className="h-10 rounded-md border border-destructive/60 px-4 text-sm font-medium text-destructive hover:bg-destructive/10">Logout</button>
          </div>
        </div>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="grid gap-4 md:grid-cols-6">
          <Metric title="Mid Price" value={numberOrDash(analytics?.midPrice ?? null)} />
          <Metric title="Spread" value={numberOrDash(analytics?.spread ?? null, 4)} />
          <Metric title="VWAP" value={numberOrDash(analytics?.vwap ?? null)} />
          <Metric title="Last Trade" value={numberOrDash(analytics?.lastTradePrice ?? null)} />
          <Metric title="Engine Queue" value={String(stats?.queueDepth ?? 0)} />
          <Metric title="Open Orders" value={String(stats?.openOrderCount ?? 0)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-lg border bg-card p-4 lg:col-span-2">
            <h2 className="mb-3 font-semibold">Price & Volume Trend ({activeSymbol})</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tradeChartData}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" minTickGap={24} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="price" name="Price" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="quantity" name="Quantity" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-semibold">Recent Trades</h2>
            <div className="max-h-72 space-y-2 overflow-auto pr-1 text-sm">
              {trades.length === 0 && <p className="text-muted-foreground">No recent trades.</p>}
              {trades.map((trade) => (
                <div key={trade.id} className="rounded border px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className={trade.aggressorSide === "buy" ? "text-emerald-500" : "text-rose-500"}>{trade.aggressorSide.toUpperCase()}</span>
                    <span>{trade.price.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Qty {trade.quantity.toFixed(4)} • {new Date(trade.executedAt).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-lg border bg-card p-4 lg:col-span-2">
            <h2 className="mb-3 font-semibold">Order Book Depth ({activeSymbol})</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bookDepthData}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="price" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Area type="monotone" dataKey="bidQty" stroke="#22c55e" fill="#22c55e33" name="Bid Depth" />
                  <Area type="monotone" dataKey="askQty" stroke="#ef4444" fill="#ef444433" name="Ask Depth" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-semibold">Auth & Navigation</h2>
            <p className="text-sm text-muted-foreground">Google OAuth and normal database login are both active.</p>
            <div className="mt-4 space-y-2 text-sm">
              <p>• Social Login: <span className="text-foreground">/auth/google</span></p>
              <p>• Email Login: <span className="text-foreground">/auth/login</span></p>
              <p>• Register: <span className="text-foreground">/auth/register</span></p>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to="/login" className="rounded-md border px-3 py-2 text-sm hover:bg-accent">Login</Link>
              <Link to="/signup" className="rounded-md border px-3 py-2 text-sm hover:bg-accent">Signup</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const Metric = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-lg border bg-card p-4">
    <p className="text-xs text-muted-foreground">{title}</p>
    <p className="text-xl font-semibold text-card-foreground">{value}</p>
  </div>
);

export default Trade;
