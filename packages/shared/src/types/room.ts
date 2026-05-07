export interface RoomCreateRequest {
  name: string;
  scheduled_at?: string;
  duration_minutes?: number;
  max_participants?: number;
  password?: string;
  recording_enabled?: boolean;
  transcription_enabled?: boolean;
}

export interface RoomResponse {
  id: string;
  slug: string;
  name: string;
  host_id: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  max_participants: number;
  password: boolean;
  recording_enabled: boolean;
  transcription_enabled: boolean;
  status: string;
  participant_count: number;
  created_at: string;
}

export interface RoomDetail extends RoomResponse {
  participants: ParticipantInfo[];
}

export interface ParticipantInfo {
  identity: string;
  display_name: string;
  role: string;
  joined_at: string;
}

export interface JoinRoomRequest {
  display_name: string;
  password?: string;
}

export interface TokenResponse {
  token: string;
  server_url: string;
  room_id: string;
  identity: string;
}
