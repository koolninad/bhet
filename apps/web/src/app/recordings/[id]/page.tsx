"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ArrowLeft, Download } from "lucide-react";

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

export default function RecordingPlaybackPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const id = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (user) loadRecording();
  }, [user, authLoading]);

  const loadRecording = async () => {
    try {
      const allRecordings = await api.recordings.list();
      const found = allRecordings.data.find((r: any) => r.id === id);
      if (found) setRecording(found);
      else setError("Recording not found");
    } catch { setError("Failed to load recording"); }
    finally { setLoading(false); }
  };

  if (authLoading || loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-950"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  }

  if (error || !recording) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Recording not found"}</p>
          <button onClick={() => router.push("/recordings")} className="px-4 py-2 bg-blue-600 rounded-lg">Back to recordings</button>
        </div>
      </div>
    );
  }

  const videoUrl = recording.download_url || "";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/recordings")} className="p-2 hover:bg-gray-800 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{recording.room_name}</h1>
            <p className="text-gray-400 text-sm">
              {new Date(recording.started_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              {recording.duration_secs && ` · ${Math.floor(recording.duration_secs / 60)}m ${Math.floor(recording.duration_secs % 60)}s`}
            </p>
          </div>
          {videoUrl && (
            <a href={videoUrl} download className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition">
              <Download className="w-4 h-4" /> Download
            </a>
          )}
        </div>

        {videoUrl ? (
          <div className="bg-black rounded-xl overflow-hidden">
            <video
              src={videoUrl}
              controls
              className="w-full max-h-[70vh]"
              preload="metadata"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-gray-500">Recording file not available</p>
          </div>
        )}
      </div>
    </div>
  );
}
