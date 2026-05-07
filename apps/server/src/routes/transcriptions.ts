import type { FastifyInstance } from "fastify";
import { query } from "../db/pool.js";
import { authenticate, getUser } from "../plugins/auth.js";
import { config } from "../config.js";

export default async function transcriptionRoutes(fastify: FastifyInstance) {
  fastify.get("/:roomId", { preHandler: [authenticate] }, async (request) => {
    const { roomId } = request.params as { roomId: string };
    const limit = parseInt((request.query as any).limit || "500");
    const since = (request.query as any).since;

    let sql = "SELECT * FROM transcriptions WHERE room_id = $1";
    const params: any[] = [roomId];

    if (since) {
      sql += " AND segment_start > $2";
      params.push(parseFloat(since));
    }

    sql += " ORDER BY segment_start ASC LIMIT $" + (params.length + 1);
    params.push(limit);

    const rows = await query(sql, params);
    return {
      data: rows.map((r: any) => ({
        id: r.id,
        speaker_label: r.speaker_label,
        text: r.text,
        language: r.language,
        confidence: r.confidence,
        segment_start: r.segment_start,
        segment_end: r.segment_end,
      })),
    };
  });

  fastify.post("/transcribe", { preHandler: [authenticate] }, async (request, reply) => {
    const { roomId, audioBase64, speakerLabel } = request.body as {
      roomId: string;
      audioBase64: string;
      speakerLabel?: string;
    };
    const { id: userId } = getUser(request);

    if (!roomId || !audioBase64) {
      return reply.status(400).send({ error: "roomId and audioBase64 required" });
    }

    try {
      const response = await fetch(config.whisper.url, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: (() => {
          const buf = Buffer.from(audioBase64, "base64");
          const fd = new FormData();
          fd.append("file", new Blob([buf], { type: "audio/webm" }), "audio.webm");
          fd.append("model", "large-v3");
          fd.append("language", "multi");
          fd.append("response_format", "verbose_json");
          fd.append("timestamp_granularities[]", "segment");
          return fd;
        })(),
      });

      if (!response.ok) {
        const errText = await response.text();
        return reply.status(502).send({ error: "Whisper transcription failed", details: errText });
      }

      const result = await response.json() as any;
      const segments = result.segments || [];

      if (segments.length === 0) {
        return { text: "", segments: [] };
      }

      const savedSegments = [];
      for (const seg of segments) {
        const saved = await query(
          "INSERT INTO transcriptions (room_id, speaker_label, text, language, confidence, segment_start, segment_end) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, speaker_label, text, segment_start, segment_end",
          [
            roomId,
            speakerLabel || result.language || "unknown",
            seg.text?.trim(),
            seg.language || result.language || "auto",
            seg.avg_logprob || seg.no_speech_prob != null ? (1 - seg.no_speech_prob) : null,
            seg.start || 0,
            seg.end || 0,
          ]
        );
        savedSegments.push(saved[0]);
      }

      return {
        text: result.text || "",
        segments: savedSegments,
        language: result.language,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: "Transcription error", details: err.message });
    }
  });
}
