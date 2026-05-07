export interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

export type WsMessage =
  | { type: "chat"; sender: string; message: string; timestamp: string }
  | { type: "participant_joined"; identity: string; timestamp: string }
  | { type: "participant_left"; identity: string; timestamp: string }
  | { type: "recording_started"; recording_id: string; timestamp: string }
  | { type: "recording_stopped"; recording_id: string; timestamp: string };
