import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RoomCreateRequest,
  RoomResponse,
  RoomDetail,
  TokenResponse,
  PaginatedResponse,
} from "@bhet/shared";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:3100/api/v1` : "http://localhost:3100/api/v1");

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  auth: {
    register: (body: RegisterRequest) =>
      request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: LoginRequest) =>
      request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    me: () => request<{ user: any }>("/auth/me"),
  },
  rooms: {
    create: (body: RoomCreateRequest) =>
      request<RoomResponse>("/rooms", { method: "POST", body: JSON.stringify(body) }),
    list: (params?: { limit?: number; offset?: number; status?: string }) => {
      const search = new URLSearchParams(params as any).toString();
      return request<PaginatedResponse<RoomResponse>>(`/rooms?${search}`);
    },
    get: (slug: string) => request<RoomDetail>(`/rooms/${slug}`),
    join: (slug: string, body: { display_name: string; password?: string }) =>
      request<TokenResponse>(`/rooms/${slug}/join`, { method: "POST", body: JSON.stringify(body) }),
    muteAll: (slug: string) =>
      request<{ success: boolean }>(`/rooms/${slug}/mute-all`, { method: "POST" }),
    kick: (slug: string, identity: string) =>
      request<{ success: boolean }>(`/rooms/${slug}/kick/${identity}`, { method: "POST" }),
    approve: (slug: string, identity: string) =>
      request<{ success: boolean }>(`/rooms/${slug}/approve/${identity}`, { method: "POST" }),
    deny: (slug: string, identity: string) =>
      request<{ success: boolean }>(`/rooms/${slug}/deny/${identity}`, { method: "POST" }),
  },
  recordings: {
    start: (roomId: string) =>
      request<{ success: boolean; recording_id: string }>("/recordings/start", { method: "POST", body: JSON.stringify({ roomId }) }),
    stop: (egressId: string) =>
      request<{ success: boolean }>(`/recordings/${egressId}/stop`, { method: "POST" }),
    list: (roomId?: string) => {
      const search = roomId ? `?roomId=${roomId}` : "";
      return request<{ data: any[] }>(`/recordings${search}`);
    },
  },
};
