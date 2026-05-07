"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useMaybeRoomContext } from "@livekit/components-react";
import { RoomEvent, Track, RemoteParticipant, RemoteTrackPublication, TrackPublication, Participant } from "livekit-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3100/api/v1";

interface TranscriptionSegment {
  id: number;
  speaker_label: string;
  text: string;
  segment_start: number;
  segment_end: number;
}

const CHUNK_INTERVAL = 5000;
const MAX_PARTICIPANTS_TO_TRANSCRIBE = 4;

export function useTranscription(roomSlug: string, enabled: boolean) {
  const room = useMaybeRoomContext();
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const mediaRecordersRef = useRef<Map<string, MediaRecorder>>(new Map());
  const chunksRef = useRef<Map<string, Blob[]>>(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);

  const processChunks = useCallback(async (identity: string, chunks: Blob[]) => {
    if (chunks.length === 0 || processingRef.current) return;

    const audioBlob = new Blob(chunks, { type: "audio/webm" });
    chunksRef.current.set(identity, []);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      if (!base64) return;

      processingRef.current = true;
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${BACKEND_URL}/transcriptions/transcribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roomId: roomSlug,
            audioBase64: base64,
            speakerLabel: identity,
          }),
        });
        const data = await res.json();
        if (data.segments && data.segments.length > 0) {
          setSegments((prev) => {
            const newSegs = data.segments.filter(
              (s: TranscriptionSegment) => !prev.some((p) => p.id === s.id)
            );
            return [...prev, ...newSegs];
          });
        }
      } catch {}
      processingRef.current = false;
    };
    reader.readAsDataURL(audioBlob);
  }, [roomSlug]);

  const startRecorder = useCallback((identity: string, stream: MediaStream) => {
    if (mediaRecordersRef.current.has(identity)) return;

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm",
    });

    chunksRef.current.set(identity, []);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        const chunks = chunksRef.current.get(identity) || [];
        chunks.push(e.data);
        chunksRef.current.set(identity, chunks);
      }
    };

    recorder.start(1000);
    mediaRecordersRef.current.set(identity, recorder);
  }, []);

  const stopRecorder = useCallback((identity: string) => {
    const recorder = mediaRecordersRef.current.get(identity);
    if (recorder && recorder.state === "recording") {
      const chunks = chunksRef.current.get(identity) || [];
      processChunks(identity, chunks);
      recorder.stop();
      mediaRecordersRef.current.delete(identity);
      chunksRef.current.delete(identity);
    }
  }, [processChunks]);

  useEffect(() => {
    if (!room || !enabled) {
      for (const [id] of mediaRecordersRef.current) {
        stopRecorder(id);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const attachTrack = (rp: RemoteParticipant) => {
      const audioPub = rp.getTrackPublication(Track.Source.Microphone) as RemoteTrackPublication;
      if (audioPub?.track && !audioPub.track.isMuted) {
        const stream = new MediaStream([audioPub.track.mediaStreamTrack]);
        startRecorder(rp.identity, stream);
      }
    };

    const detachTrack = (identity: string) => {
      stopRecorder(identity);
    };

    for (const [, rp] of room.remoteParticipants) {
      attachTrack(rp);
    }

    const onSubscribed = (_track: any, pub: RemoteTrackPublication, rp: RemoteParticipant) => {
      if (pub.source === Track.Source.Microphone && mediaRecordersRef.current.size < MAX_PARTICIPANTS_TO_TRANSCRIBE) {
        attachTrack(rp);
      }
    };
    const onUnsubscribed = (_track: any, pub: RemoteTrackPublication, rp: RemoteParticipant) => {
      if (pub.source === Track.Source.Microphone) {
        detachTrack(rp.identity);
      }
    };
    const onMuted = (pub: TrackPublication, participant: Participant) => {
      if (pub.source === Track.Source.Microphone) {
        detachTrack(participant.identity);
      }
    };
    const onUnmuted = (pub: TrackPublication, participant: Participant) => {
      if (pub.source === Track.Source.Microphone && mediaRecordersRef.current.size < MAX_PARTICIPANTS_TO_TRANSCRIBE) {
        attachTrack(participant as RemoteParticipant);
      }
    };
    const onDisconnected = (participant: RemoteParticipant) => {
      detachTrack(participant.identity);
    };

    room.on(RoomEvent.TrackSubscribed, onSubscribed as any);
    room.on(RoomEvent.TrackUnsubscribed, onUnsubscribed as any);
    room.on(RoomEvent.TrackMuted, onMuted as any);
    room.on(RoomEvent.TrackUnmuted, onUnmuted as any);
    room.on(RoomEvent.ParticipantDisconnected, onDisconnected as any);

    timerRef.current = setInterval(() => {
      for (const [id] of mediaRecordersRef.current) {
        const chunks = chunksRef.current.get(id) || [];
        processChunks(id, chunks);
      }
    }, CHUNK_INTERVAL);

    return () => {
      room.off(RoomEvent.TrackSubscribed, onSubscribed as any);
      room.off(RoomEvent.TrackUnsubscribed, onUnsubscribed as any);
      room.off(RoomEvent.TrackMuted, onMuted as any);
      room.off(RoomEvent.TrackUnmuted, onUnmuted as any);
      room.off(RoomEvent.ParticipantDisconnected, onDisconnected as any);

      for (const [id] of mediaRecordersRef.current) {
        stopRecorder(id);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [room, enabled, startRecorder, stopRecorder, processChunks]);

  const clearSegments = useCallback(() => setSegments([]), []);

  return { segments, clearSegments };
}
