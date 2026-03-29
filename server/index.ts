import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { initDb } from "./db.js";
import router from "./routes.js";

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
  app.use(express.json({ limit: '10mb' }));

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

  wss.on("connection", (ws) => {
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
      // { type: "publish", orderId, role: "motoboy" }
      if (msg.type === "publish" && typeof msg.orderId === "string") {
        watchedOrderId = msg.orderId;
        role = "motoboy";
        // If there's a last known position, send it back so motoboy knows we're ready
        const last = latestCoords.get(msg.orderId);
        if (last) {
          ws.send(JSON.stringify({ type: "ack", lat: last.lat, lng: last.lng }));
        }
      }

      // Client: subscribe to watch a motoboy's position for an order
      // { type: "watch", orderId, role: "client" }
      if (msg.type === "watch" && typeof msg.orderId === "string") {
        // Leave previous room if any
        if (watchedOrderId && role === "client") {
          orderWatchers.get(watchedOrderId)?.delete(ws);
        }
        watchedOrderId = msg.orderId;
        role = "client";
        if (!orderWatchers.has(msg.orderId)) {
          orderWatchers.set(msg.orderId, new Set());
        }
        orderWatchers.get(msg.orderId)!.add(ws);

        // Immediately send the last known position if available
        const last = latestCoords.get(msg.orderId);
        if (last) {
          ws.send(JSON.stringify({ type: "location", orderId: msg.orderId, lat: last.lat, lng: last.lng, ts: last.ts }));
        }
      }

      // Motoboy: push a GPS location update
      // { type: "location", orderId, lat, lng }
      if (
        msg.type === "location" &&
        typeof msg.orderId === "string" &&
        typeof msg.lat === "number" &&
        typeof msg.lng === "number"
      ) {
        const coords = { lat: msg.lat, lng: msg.lng, ts: Date.now() };
        latestCoords.set(msg.orderId, coords);

        const payload = JSON.stringify({
          type: "location",
          orderId: msg.orderId,
          lat: msg.lat,
          lng: msg.lng,
          ts: coords.ts,
        });

        // Broadcast to all clients watching this order
        const watchers = orderWatchers.get(msg.orderId);
        if (watchers) {
          for (const client of watchers) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          }
        }
      }

      // Motoboy or system: stop publishing (delivery done)
      // { type: "stop", orderId }
      if (msg.type === "stop" && typeof msg.orderId === "string") {
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

  const port = process.env.PORT || (process.env.NODE_ENV === "production" ? 3000 : 3001);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`WebSocket tracking server ready at ws://localhost:${port}/ws/tracking`);
  });
}

startServer().catch(console.error);
