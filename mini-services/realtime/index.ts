/**
 * TeamFlow — Realtime mini-service (Socket.IO)
 *
 * Single-process Bun service that:
 *  - Hosts a Socket.IO server on port 3003 with `path: "/"` (Caddy expects "/").
 *  - Allows any origin (CORS: *).
 *  - Supports room-based fan-out: clients subscribe to `org:<orgId>` / `user:<userId>`.
 *  - Exposes `POST /broadcast` on the SAME HTTP server for the Next.js API to fan out
 *    events: `{ event: string, room?: string, payload: any }`.
 *  - Exposes `GET /health` returning `{ ok: true, connections: <n> }`.
 *  - Shuts down gracefully on SIGTERM / SIGINT.
 *
 * NOTE on `path: "/"`: engine.io's attach() installs a wrapper "request" listener
 * that intercepts every URL whose path begins with the configured path. With
 * path "/", that is *every* URL, which would shadow our /health and /broadcast
 * routes. To work around this we capture engine.io's wrapper listener, remove it,
 * and install our own dispatcher that handles /health and /broadcast first, then
 * delegates everything else to the captured engine.io wrapper.
 *
 * Run with: `bun --hot index.ts` (see root package.json `realtime` script).
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { Server, type Socket } from "socket.io";

const PORT = Number(process.env.PORT ?? 3003);

// ---- Shared HTTP server (also used by Socket.IO) ----------------------------
// Create WITHOUT a request handler so engine.io captures an empty listener list.
const httpServer = createServer();

// ---- Socket.IO server (attaches its own request wrapper) --------------------
const io = new Server(httpServer, {
  path: "/", // CRITICAL: Caddy gateway expects path "/"
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Capture engine.io's wrapper listener, then replace it with our dispatcher so
// /health and /broadcast take priority over socket.io's path match.
const engineRequestListener = httpServer.listeners("request")[0] as
  | ((req: IncomingMessage, res: ServerResponse) => void)
  | undefined;
httpServer.removeAllListeners("request");

httpServer.on("request", async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url ?? "";

  // GET /health
  if (req.method === "GET" && url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, connections: io.engine.clientsCount }));
    return;
  }

  // POST /broadcast
  if (req.method === "POST" && url === "/broadcast") {
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const event = String(body?.event ?? "");
      const room = body?.room != null ? String(body.room) : undefined;
      const payload = body?.payload;

      if (!event) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "missing `event`" }));
        return;
      }

      if (room) io.to(room).emit(event, payload);
      else io.emit(event, payload);

      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, delivered: true }));
      return;
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "invalid JSON body" }));
      return;
    }
  }

  // Not one of our routes — delegate to engine.io's wrapper (handles socket.io
  // polling/websocket upgrade requests and responds 404 for everything else).
  if (engineRequestListener) engineRequestListener.call(httpServer, req, res);
  else {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not found" }));
  }
});

// ---- Socket.IO connection handling ------------------------------------------
interface SubscribePayload {
  rooms?: string[];
}

io.on("connection", (socket: Socket) => {
  console.log(`[io] connect  id=${socket.id} total=${io.engine.clientsCount}`);

  socket.on("subscribe", (data: SubscribePayload) => {
    const rooms = Array.isArray(data?.rooms)
      ? data.rooms.filter((r): r is string => typeof r === "string")
      : [];
    for (const room of rooms) socket.join(room);
    console.log(
      `[io] subscribe   id=${socket.id} rooms=${rooms.join(",") || "(none)"} total=${socket.rooms.size}`,
    );
  });

  socket.on("unsubscribe", (data: SubscribePayload) => {
    const rooms = Array.isArray(data?.rooms)
      ? data.rooms.filter((r): r is string => typeof r === "string")
      : [];
    for (const room of rooms) socket.leave(room);
    console.log(
      `[io] unsubscribe id=${socket.id} rooms=${rooms.join(",") || "(none)"} total=${socket.rooms.size}`,
    );
  });

  socket.on("disconnect", (reason: string) => {
    console.log(
      `[io] disconnect  id=${socket.id} reason=${reason} total=${io.engine.clientsCount}`,
    );
  });

  socket.on("error", (err: Error) => {
    console.error(`[io] error id=${socket.id}:`, err.message);
  });
});

// ---- Start + graceful shutdown ---------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`[realtime] Socket.IO server listening on http://0.0.0.0:${PORT} (path: "/")`);
});

function shutdown(signal: string) {
  console.log(`[realtime] ${signal} received, shutting down...`);
  io.close(() => {
    httpServer.close(() => {
      console.log("[realtime] server closed");
      process.exit(0);
    });
  });
  // Force-exit if graceful close hangs > 5s
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
