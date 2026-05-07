"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  sender: string;
  message: string;
  timestamp: string;
}

export function ChatPanel({ messages, onSend, identity }: { messages: Message[]; onSend: (msg: string) => void; identity: string }) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      <div className="px-4 py-3 border-b border-gray-800 font-medium text-sm">Chat</div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-600 text-sm text-center">No messages yet</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender === identity;
          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <span className="text-xs text-gray-500 mb-0.5">{msg.sender}</span>
              <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                isMe ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"
              }`}>
                {msg.message}
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm transition"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
