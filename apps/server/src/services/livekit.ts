import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import { config } from "../config.js";

export const roomService = new RoomServiceClient(
  config.liveKit.url,
  config.liveKit.apiKey,
  config.liveKit.apiSecret
);

export async function createLiveKitRoom(roomName: string) {
  return roomService.createRoom({
    name: roomName,
    emptyTimeout: 300,
    maxParticipants: 100,
  });
}

export async function generateToken(
  roomName: string,
  identity: string,
  options?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
    metadata?: string;
  }
) {
  const at = new AccessToken(config.liveKit.apiKey, config.liveKit.apiSecret, {
    identity,
    metadata: options?.metadata,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: options?.canPublish ?? true,
    canSubscribe: options?.canSubscribe ?? true,
    canPublishData: options?.canPublishData ?? true,
  });

  return { token: await at.toJwt(), serverUrl: config.liveKit.url.replace(/^http/, "ws").replace("localhost", "192.168.0.215") };
}

export async function removeParticipant(roomName: string, identity: string) {
  return roomService.removeParticipant(roomName, identity);
}

export async function listParticipants(roomName: string) {
  return roomService.listParticipants(roomName);
}

export async function muteParticipant(roomName: string, identity: string, muted: boolean) {
  const participants = await roomService.listParticipants(roomName);
  const participant = participants.find((p) => p.identity === identity);
  if (!participant) throw new Error("Participant not found");

  const micTrack = participant.tracks?.find((t) => t.source === TrackSource.MICROPHONE);
  if (!micTrack) throw new Error("No microphone track found");

  return roomService.mutePublishedTrack(roomName, identity, micTrack.sid, muted);
}

export async function muteAllParticipants(roomName: string) {
  const participants = await roomService.listParticipants(roomName);
  const results = [];
  for (const p of participants) {
    const micTrack = p.tracks?.find((t) => t.source === TrackSource.MICROPHONE);
    if (micTrack) {
      results.push(roomService.mutePublishedTrack(roomName, p.identity, micTrack.sid, true));
    }
  }
  return Promise.all(results);
}

export async function updateParticipantPermissions(
  roomName: string,
  identity: string,
  canPublish: boolean
) {
  return roomService.updateParticipant(roomName, identity, {
    permission: { canPublish, canPublishData: canPublish, canSubscribe: true },
  });
}
