import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import type { WebSocket } from "@fastify/websocket";
import corsPlugin from "./plugins/cors.js";
import authPlugin from "./plugins/auth.js";
import websocketPlugin from "./plugins/websocket.js";
import authRoutes from "./routes/auth.js";
import roomRoutes from "./routes/rooms.js";
import healthRoutes from "./routes/health.js";
import recordingRoutes from "./routes/recordings.js";
import transcriptionRoutes from "./routes/transcriptions.js";
import { config } from "./config.js";
import { joinRoom, leaveRoom, handleMessage } from "./services/chat.js";

const fastify = Fastify({ logger: { level: "info" } });

async function start() {
  await fastify.register(corsPlugin);
  await fastify.register(authPlugin);
  await fastify.register(websocketPlugin);

  fastify.register(healthRoutes, { prefix: "/api/v1" });
  fastify.register(authRoutes, { prefix: "/api/v1/auth" });
  fastify.register(roomRoutes, { prefix: "/api/v1/rooms" });
  fastify.register(recordingRoutes, { prefix: "/api/v1/recordings" });
  fastify.register(transcriptionRoutes, { prefix: "/api/v1/transcriptions" });

  // WebSocket chat
  fastify.register(async function (f) {
    f.get("/ws/chat/:roomId", { websocket: true }, (socket: WebSocket, req) => {
      const { roomId } = req.params as { roomId: string };
      const identity = (req.query as any).identity || "anonymous";

      const conn = { ws: socket, identity, roomId };
      joinRoom(conn);

      socket.on("message", (data: Buffer) => handleMessage(conn, data.toString()));
      socket.on("close", () => leaveRoom(conn));
    });
  });

  // Serve recording files
  await fastify.register(fastifyStatic, {
    root: path.resolve(config.recordingsDir),
    prefix: "/api/v1/recordings/",
    decorateReply: false,
  });

  await fastify.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`Bhet server running on port ${config.port}`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export default fastify;
