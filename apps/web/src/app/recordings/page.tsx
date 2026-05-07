"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Video, Clock, Calendar, Play } from "lucide-react";

interface Recording {
  id: string;
  room_id: string;
  room_name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_secs: number | null;
  download_url: string | null;
}

export default function RecordingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (user) loadRecordings();
  }, [user, authLoading, roomId]);

  const loadRecordings = async () => {
    try {
      const res = await api.recordings.list(roomId || undefined);
      setRecordings(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  const formatDuration = (secs: number | null) => {
    if (!secs) return "--:--";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (authLoading || loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-950"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Recordings</h1>
            <p className="text-gray-400 text-sm mt-1">{recordings.length} recording{recordings.length !== 1 ? "s" : ""} found</p>
          </div>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Filter by room ID..."
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-64"
          />
        </div>

        {recordings.length === 0 ? (
          <div className="text-center py-20">
            <Video className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No recordings yet</p>
            <p className="text-gray-600 text-sm mt-1">Start recording a meeting to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                  {r.download_url ? (
                    <button onClick={() => router.push(`/recordings/${r.id}`)} className="text-blue-400 hover:text-blue-300"><Play className="w-5 h-5" /></button>
                  ) : (
                    <Video className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{r.room_name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(r.started_at)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(r.duration_secs)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === "completed" ? "bg-green-900 text-green-400" : r.status === "recording" ? "bg-red-900 text-red-400" : "bg-gray-800 text-gray-400"}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
                {r.download_url && (
                  <a href={r.download_url} download className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg transition shrink-0">Download</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
