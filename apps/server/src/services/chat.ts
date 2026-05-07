import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { query } from "../db/pool.js";

interface ChatConnection {
  ws: WebSocket;
  identity: string;
  roomId: string;
}

const rooms = new Map<string, Set<ChatConnection>>();

function broadcast(roomId: string, message: object, exclude?: WebSocket) {
  const connections = rooms.get(roomId);
  if (!connections) return;
  const data = JSON.stringify(message);
  for (const conn of connections) {
    if (conn.ws !== exclude && conn.ws.readyState === 1) {
      conn.ws.send(data);
    }
  }
}

export async function joinRoom(conn: ChatConnection) {
  if (!rooms.has(conn.roomId)) {
    rooms.set(conn.roomId, new Set());
  }
  rooms.get(conn.roomId)!.add(conn);

  broadcast(conn.roomId, {
    type: "participant_joined",
    identity: conn.identity,
    timestamp: new Date().toISOString(),
  });

  // Send recent messages (last 50)
  const messages = await query<{ sender_identity: string; message: string; sent_at: string }>(
    "SELECT sender_identity, message, sent_at FROM chat_messages WHERE room_id = $1 ORDER BY sent_at DESC LIMIT 50",
    [conn.roomId]
  );
  for (const msg of messages.reverse()) {
    conn.ws.send(JSON.stringify({ type: "chat", sender: msg.sender_identity, message: msg.message, timestamp: msg.sent_at }));
  }
}

export function leaveRoom(conn: ChatConnection) {
  const connections = rooms.get(conn.roomId);
  if (connections) {
    connections.delete(conn);
    if (connections.size === 0) rooms.delete(conn.roomId);
    broadcast(conn.roomId, {
      type: "participant_left",
      identity: conn.identity,
      timestamp: new Date().toISOString(),
    });
  }
}

export function handleMessage(conn: ChatConnection, data: string) {
  try {
    const msg = JSON.parse(data);
    if (msg.type === "chat" && msg.message) {
      broadcast(conn.roomId, {
        type: "chat",
        sender: conn.identity,
        message: msg.message,
        timestamp: new Date().toISOString(),
      });

      // Persist to DB
      query(
        "INSERT INTO chat_messages (room_id, sender_identity, message) VALUES ($1, $2, $3)",
        [conn.roomId, conn.identity, msg.message]
      ).catch(() => {});
    }
  } catch {
    // Ignore malformed messages
  }
}

export function getRoomConnections(roomId: string): number {
  return rooms.get(roomId)?.size || 0;
}
