"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import type { RoomResponse } from "@bhet/shared";
import { Video, LogOut, Calendar, Plus, Clock, Users } from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      api.rooms.list().then((res) => {
        setRooms(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">Amrut Bhet</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.name}</span>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-white transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Meetings</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your scheduled and past meetings</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Quick Start
            </Link>
            <Link
              href="/meeting/new"
              className="px-4 py-2 border border-gray-700 hover:border-gray-500 rounded-xl text-sm transition flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </Link>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-16">
            <Video className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-400">No meetings yet</h2>
            <p className="text-gray-600 text-sm mt-1">Create your first meeting to get started</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div key={room.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition">
                <h3 className="font-semibold mb-3 truncate">{room.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {room.scheduled_at
                      ? new Date(room.scheduled_at).toLocaleString()
                      : "Instant"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {room.participant_count}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/room/${room.slug}`}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-center transition"
                  >
                    Join
                  </Link>
                  <button className="px-3 py-2 border border-gray-700 hover:border-gray-500 rounded-lg text-sm transition">
                    Copy Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
