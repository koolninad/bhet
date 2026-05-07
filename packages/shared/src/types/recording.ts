export interface Recording {
  id: string;
  room_id: string;
  room_name: string;
  status: "pending" | "recording" | "completed" | "failed";
  started_at: string;
  ended_at: string | null;
  duration_secs: number | null;
  file_size_bytes: number | null;
  download_url: string | null;
}

export interface StartRecordingRequest {
  room_id: string;
}
