import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import rateLimit from "express-rate-limit";
import { initDb, pool } from "./db.js";
import router from "./routes.js";
import { verifyToken } from "./auth.js";

// ── Rate limiters ─────────────────────────────────────────────────────────────

// Strict limiter for auth endpoints — defends against brute-force and enumeration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
});

// Tighter limiter for Google Maps geocode calls — prevents external API cost abuse
const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de geocodificação atingido. Tente novamente em breve.' },
});

// General limiter for all other API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em breve.' },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory map: orderId -> Set of connected WebSocket clients watching that order
const orderWatchers = new Map<string, Set<WebSocket>>();

// In-memory map: orderId -> latest known motoboy coords
const latestCoords = new Map<string, { lat: number; lng: number; ts: number }>();

async function startServer() {
  try {
    await initDb();
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }

  const app = express();
  // Replit runs behind a reverse proxy — trust its X-Forwarded-For header
  // so rate limiting and IP-based features work correctly.
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Apply rate limiters — specific paths first, then the general fallback
  app.use('/api/auth', authLimiter);
  app.use('/api/geocode', geocodeLimiter);
  app.use('/api', apiLimiter);

  app.use('/api', router);

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const server = createServer(app);

  // WebSocket server on the same HTTP server
  const wss = new WebSocketServer({ server, path: "/ws/tracking" });

  wss.on("connection", (ws, req) => {
    // ── Authentication ────────────────────────────────────────────────────────
    const urlObj = new URL(req.url ?? "/", "http://localhost");
    const token = urlObj.searchParams.get("token");
    const jwtUser = token ? verifyToken(token) : null;

    if (!jwtUser) {
      ws.close(1008, "Unauthorized");
      return;
    }

    let watchedOrderId: string | null = null;
    let role: "motoboy" | "client" | null = null;

    ws.on("message", (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // Motoboy: subscribe to publish their location for an order
      // { type: "publish", orderId }
      if (msg.type === "publish" && typeof msg.orderId === "string") {
        if (!jwtUser.roles.includes("motoboy")) {
          ws.send(JSON.stringify({ type: "error", message: "Forbidden: motoboy role required" }));
          return;
        }
        watchedOrderId = msg.orderId;
        role = "motoboy";
        const last = latestCoords.get(msg.orderId);
        if (last) {
          ws.send(JSON.stringify({ type: "ack", lat: last.lat, lng: last.lng }));
        }
      }

      // Client / seller / admin: subscribe to watch a motoboy's position for an order
      // { type: "watch", orderId }
      if (msg.type === "watch" && typeof msg.orderId === "string") {
        const isAdmin = jwtUser.roles.includes("admin");
        const isSeller = jwtUser.roles.includes("seller");

        // Verify the requesting user owns this order (skip check for admin/seller)
        if (!isAdmin && !isSeller) {
          pool.query("SELECT client_id FROM orders WHERE id = $1", [msg.orderId])
            .then((r) => {
              if (r.rows.length === 0) {
                ws.send(JSON.stringify({ type: "error", message: "Order not found" }));
                return;
              }
              if (r.rows[0].client_id !== jwtUser.id) {
                ws.send(JSON.stringify({ type: "error", message: "Forbidden: not your order" }));
                return;
              }
              subscribeWatch(ws, msg.orderId as string);
            })
            .catch(() => {
              ws.send(JSON.stringify({ type: "error", message: "Internal error" }));
            });
          return;
        }

        subscribeWatch(ws, msg.orderId);
      }

      // Motoboy: push a GPS location update
      // { type: "location", orderId, lat, lng }
      if (
        msg.type === "location" &&
        typeof msg.orderId === "string" &&
        typeof msg.lat === "number" &&
        typeof msg.lng === "number"
      ) {
        if (!jwtUser.roles.includes("motoboy")) return;

        const coords = { lat: msg.lat, lng: msg.lng, ts: Date.now() };
        latestCoords.set(msg.orderId, coords);

        const payload = JSON.stringify({
          type: "location",
          orderId: msg.orderId,
          lat: msg.lat,
          lng: msg.lng,
          ts: coords.ts,
        });

        const watchers = orderWatchers.get(msg.orderId);
        if (watchers) {
          for (const client of watchers) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          }
        }
      }

      // Motoboy: stop publishing (delivery done)
      // { type: "stop", orderId }
      if (msg.type === "stop" && typeof msg.orderId === "string") {
        if (!jwtUser.roles.includes("motoboy")) return;

        latestCoords.delete(msg.orderId);
        const watchers = orderWatchers.get(msg.orderId);
        if (watchers) {
          const stopMsg = JSON.stringify({ type: "stopped", orderId: msg.orderId });
          for (const client of watchers) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(stopMsg);
            }
          }
          orderWatchers.delete(msg.orderId);
        }
      }
    });

    ws.on("close", () => {
      if (watchedOrderId && role === "client") {
        orderWatchers.get(watchedOrderId)?.delete(ws);
        if (orderWatchers.get(watchedOrderId)?.size === 0) {
          orderWatchers.delete(watchedOrderId);
        }
      }
    });
  });

  function subscribeWatch(ws: WebSocket, orderId: string) {
    orderWatchers.get(orderId)?.delete(ws); // leave previous room if rejoining
    if (!orderWatchers.has(orderId)) {
      orderWatchers.set(orderId, new Set());
    }
    orderWatchers.get(orderId)!.add(ws);

    const last = latestCoords.get(orderId);
    if (last) {
      ws.send(JSON.stringify({ type: "location", orderId, lat: last.lat, lng: last.lng, ts: last.ts }));
    }
  }

  const port = process.env.PORT || (process.env.NODE_ENV === "production" ? 3000 : 3001);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`WebSocket tracking server ready at ws://localhost:${port}/ws/tracking`);
  });
}

startServer().catch(console.error);
