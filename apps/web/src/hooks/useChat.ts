"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { WsMessage } from "@bhet/shared";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== "undefined" ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:3100/ws` : "ws://localhost:3100/ws");

interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

export function useChat(roomId: string, identity: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId || !identity) return;

    const ws = new WebSocket(`${WS_URL}/chat/${roomId}?identity=${encodeURIComponent(identity)}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data);
        if (data.type === "chat") {
          setMessages((prev) => [...prev, { sender: data.sender, message: data.message, timestamp: data.timestamp }]);
        }
      } catch {}
    };

    ws.onclose = () => setConnected(false);

    return () => { ws.close(); };
  }, [roomId, identity]);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: "chat", message }));
    }
  }, []);

  return { messages, connected, sendMessage };
}
