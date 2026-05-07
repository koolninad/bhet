"use client";

import { useMaybeRoomContext } from "@livekit/components-react";
import { useEffect, useState } from "react";
import { RoomEvent, Track } from "livekit-client";
import { MicOff, VideoOff, Hand, Shield, Check, X } from "lucide-react";

interface ParticipantEntry {
  identity: string;
  name: string;
  isLocal: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  handRaised: boolean;
  isHost: boolean;
}

export function ParticipantSidebar({
  onKick, onMute, isHost, identity,
}: {
  onKick?: (identity: string) => void;
  onMute?: () => void;
  isHost: boolean;
  identity: string;
}) {
  const slug = typeof window !== "undefined" ? window.location.pathname.split("/room/")[1]?.split("/")[0] || "" : "";
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:3100/api/v1` : "http://localhost:3100/api/v1");

  const handleApprove = async (targetIdentity: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${BACKEND_URL}/rooms/${slug}/approve/${encodeURIComponent(targetIdentity)}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch {}
  };

  const handleDeny = async (targetIdentity: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${BACKEND_URL}/rooms/${slug}/deny/${encodeURIComponent(targetIdentity)}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch {}
  };
  const room = useMaybeRoomContext();
  const [entries, setEntries] = useState<ParticipantEntry[]>([]);

  useEffect(() => {
    if (!room) return;
    const update = () => {
      if (!room) return;
      const list: ParticipantEntry[] = [];

      const lp = room.localParticipant;
      const lm = JSON.parse(lp.metadata || "{}");
      const mic = lp.getTrackPublication(Track.Source.Microphone);
      const cam = lp.getTrackPublication(Track.Source.Camera);
      list.push({
        identity: lp.identity, name: lm.displayName || lp.identity, isLocal: true,
        isMuted: mic?.isMuted ?? true, isCameraOn: !!cam?.track,
        handRaised: lm.handRaised === "true", isHost: lm.role === "host",
      });

      for (const [, rp] of room.remoteParticipants) {
        const rm = JSON.parse(rp.metadata || "{}");
        const mic = rp.getTrackPublication(Track.Source.Microphone);
        const cam = rp.getTrackPublication(Track.Source.Camera);
        list.push({
          identity: rp.identity, name: rm.displayName || rp.identity, isLocal: false,
          isMuted: mic?.isMuted ?? true, isCameraOn: cam?.isSubscribed ?? false,
          handRaised: rm.handRaised === "true", isHost: rm.role === "host",
        });
      }
      setEntries(list);
    };

    update();
    const events = [RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted, RoomEvent.ParticipantMetadataChanged, RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected];
    for (const ev of events) room.on(ev, update);
    return () => { for (const ev of events) room.off(ev, update); };
  }, [room]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      <div className="px-4 py-3 border-b border-gray-800 font-medium text-sm flex items-center justify-between">
        <span>Participants ({entries.length})</span>
        {isHost && <button onClick={() => onMute?.()} className="text-xs text-red-400 hover:text-red-300">Mute all</button>}
      </div>
      <div className="flex-1 overflow-y-auto">
        {entries.map((p) => (
          <div key={p.identity} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium">{(p.name || p.identity).charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm truncate">{p.name || p.identity}</span>
                {p.isHost && <Shield className="w-3 h-3 text-yellow-400" />}
                {p.handRaised && <Hand className="w-3 h-3 text-blue-400" />}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {p.isMuted ? <MicOff className="w-3 h-3 text-red-400" /> : <span className="w-3 h-3 text-green-400 inline-block" style={{ fontSize: 10 }}>&#9679;</span>}
                {p.isCameraOn ? <span className="w-3 h-3 text-green-400 inline-block" style={{ fontSize: 10 }}>&#9679;</span> : <VideoOff className="w-3 h-3 text-gray-500" />}
              </div>
            </div>
            {isHost && !p.isLocal && (
              <div className="flex items-center gap-1">
                <button onClick={() => onKick?.(p.identity)} className="text-xs text-red-400 hover:text-red-300 p-1" title="Remove">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
