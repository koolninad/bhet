"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Video, ArrowLeft } from "lucide-react";

export default function PreJoinPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const slug = params.slug as string;

  const [displayName, setDisplayName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/room/${slug}`);
      return;
    }
    setDisplayName(user.name);
    api.rooms.get(slug)
      .then((room) => { setHasPassword(!!room.password); setRoomName(room.name); })
      .catch(() => { setError("Room not found"); })
      .finally(() => setLoading(false));
  }, [user, authLoading, slug, router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { setError("Please enter your name"); return; }
    setJoining(true);
    setError("");
    try {
      const res = await api.rooms.join(slug, {
        display_name: displayName.trim(),
        password: hasPassword ? roomPassword : undefined,
      });
      router.push(`/room/${slug}/room?token=${encodeURIComponent(res.token)}&serverUrl=${encodeURIComponent(res.server_url)}&identity=${encodeURIComponent(res.identity)}&name=${encodeURIComponent(roomName || slug)}`);
    } catch (err: any) {
      setError(err.message || "Failed to join room");
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join Meeting</h1>
          <p className="text-gray-400 text-sm mt-1">{roomName || slug}</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Your name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Enter your display name"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {hasPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Meeting password</label>
              <input
                type="password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                required
                placeholder="Enter meeting password"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={joining}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl font-medium text-white transition"
          >
            {joining ? "Joining..." : "Join now"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-2 text-sm text-gray-400 hover:text-white transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </form>
      </div>
    </div>
  );
}
