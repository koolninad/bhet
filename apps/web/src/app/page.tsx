"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useState } from "react";
import { Video, LogOut, Calendar, Plus } from "lucide-react";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [newMeetingName, setNewMeetingName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    setError("");
    try {
      const room = await api.rooms.create({ name: newMeetingName || "Quick Meeting" });
      router.push(`/room/${room.slug}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold">Amrut Bhet</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">
                Sign in
              </Link>
              <Link href="/signup" className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition">
                Sign up
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-xl">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Video className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Amrut Bhet</h1>
            <p className="text-gray-400 text-lg mb-8">
              Secure, self-hosted video conferencing. Create meetings, connect with your team, and collaborate from anywhere.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/signup" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-lg font-medium transition">
                Get started
              </Link>
              <Link href="/login" className="px-6 py-3 border border-gray-700 hover:border-gray-500 rounded-xl text-lg transition">
                Sign in
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">Amrut Bhet</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition">
              <Calendar className="w-4 h-4" />
              Dashboard
            </Link>
            <span className="text-sm text-gray-400">{user.name}</span>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-white transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome, {user.name}</h1>
            <p className="text-gray-400">Start a new meeting or manage your scheduled ones.</p>
          </div>
          <form onSubmit={handleCreate} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <Plus className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold">New Meeting</h2>
            </div>
            <input
              type="text"
              placeholder="Meeting name (optional)"
              value={newMeetingName}
              onChange={(e) => setNewMeetingName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition mb-4"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl font-medium transition flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" />
                {creating ? "Creating..." : "Start Now"}
              </button>
              <Link
                href="/meeting/new"
                className="py-3 px-4 border border-gray-700 hover:border-gray-500 rounded-xl transition text-sm"
              >
                Schedule
              </Link>
            </div>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </form>
        </div>
      </main>
    </div>
  );
}
