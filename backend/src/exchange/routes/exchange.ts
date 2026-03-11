import { Router } from "express";
import { z } from "zod";
import { matchingEngine } from "../services/MatchingEngine.js";
import type { CreateOrderRequest } from "../domain/types.js";

const router = Router();

const accountSchema = z.object({
  traderId: z.string().min(2),
  cashDelta: z.number().finite(),
});

const orderSchema: z.ZodType<CreateOrderRequest> = z.object({
  traderId: z.string().min(2),
  symbol: z.string().trim().toUpperCase().min(2).max(15),
  side: z.enum(["buy", "sell"]),
  price: z.number().positive(),
  quantity: z.number().positive(),
  timeInForce: z.enum(["gtc", "ioc"]).optional(),
  clientOrderId: z.string().max(64).optional(),
});

const cancelSchema = z.object({
  traderId: z.string().min(2),
});

const orderBookQuerySchema = z.object({
  depth: z.coerce.number().int().min(1).max(200).default(20),
});

const tradesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const symbolParamSchema = z.object({
  symbol: z.string().trim().min(2).max(15),
});

router.post("/accounts/fund", (req, res) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid account funding payload",
      details: parsed.error.flatten(),
    });
  }

  const account = matchingEngine.createOrUpdateAccount(parsed.data.traderId, parsed.data.cashDelta);
  if (!account) {
    return res.status(422).json({
      success: false,
      error: "Funding operation would violate reserved cash constraints",
    });
  }

  return res.status(200).json({ success: true, data: account });
});

router.get("/accounts/:traderId", (req, res) => {
  const account = matchingEngine.getAccount(req.params.traderId);
  if (!account) {
    return res.status(404).json({ success: false, error: "Account not found" });
  }
  return res.status(200).json({ success: true, data: account });
});

router.post("/orders", async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid order payload",
      details: parsed.error.flatten(),
    });
  }

  const result = await matchingEngine.enqueueOrder(parsed.data as CreateOrderRequest);

  if (!result.accepted) {
    return res.status(422).json({ success: false, error: result.reason });
  }

  return res.status(201).json({
    success: true,
    data: {
      order: result.order,
      trades: result.trades,
    },
  });
});

router.delete("/orders/:orderId", (req, res) => {
  const parsed = cancelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid cancel payload",
      details: parsed.error.flatten(),
    });
  }

  const result = matchingEngine.cancelOrder(req.params.orderId, parsed.data.traderId);
  if (!result.cancelled) {
    return res.status(409).json({ success: false, error: result.reason });
  }

  return res.status(200).json({ success: true, data: result.order });
});

router.get("/orderbook/:symbol", (req, res) => {
  const parsedParams = symbolParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid symbol path params",
      details: parsedParams.error.flatten(),
    });
  }

  const parsedQuery = orderBookQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid orderbook query params",
      details: parsedQuery.error.flatten(),
    });
  }

  const snapshot = matchingEngine.getOrderBook(parsedParams.data.symbol, parsedQuery.data.depth);
  return res.status(200).json({ success: true, data: snapshot });
});

router.get("/trades/:symbol", (req, res) => {
  const parsedParams = symbolParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid symbol path params",
      details: parsedParams.error.flatten(),
    });
  }

  const parsedQuery = tradesQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid trades query params",
      details: parsedQuery.error.flatten(),
    });
  }

  const trades = matchingEngine.getTrades(parsedParams.data.symbol, parsedQuery.data.limit);
  return res.status(200).json({ success: true, data: trades });
});

router.get("/analytics/:symbol", (req, res) => {
  const parsedParams = symbolParamSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({
      success: false,
      error: "Invalid symbol path params",
      details: parsedParams.error.flatten(),
    });
  }

  const analytics = matchingEngine.getAnalytics(parsedParams.data.symbol);
  return res.status(200).json({ success: true, data: analytics });
});

router.get("/stats", (_req, res) => {
  const stats = matchingEngine.getStats();
  return res.status(200).json({ success: true, data: stats });
});

router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const unsubscribe = matchingEngine.onEvent((event) => {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on("close", () => {
    unsubscribe();
    res.end();
  });
});

export default router;
