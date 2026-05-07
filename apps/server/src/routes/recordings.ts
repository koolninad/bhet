import type { FastifyInstance } from "fastify";
import { query, queryOne } from "../db/pool.js";
import { authenticate, getUser } from "../plugins/auth.js";
import { EgressClient, EncodedFileType, EncodedOutputs } from "livekit-server-sdk";
import { config } from "../config.js";

const egressClient = new EgressClient(config.liveKit.url, config.liveKit.apiKey, config.liveKit.apiSecret);

export default async function recordingRoutes(fastify: FastifyInstance) {
  fastify.post("/start", { preHandler: [authenticate] }, async (request, reply) => {
    const { id: userId } = getUser(request);
    const { roomId } = request.body as { roomId: string };

    const room = await queryOne<{ id: string; host_id: string; name: string }>(
      "SELECT id, host_id, name FROM rooms WHERE id = $1 OR slug = $1", [roomId]
    );
    if (!room) return reply.status(404).send({ error: "Room not found" });
    if (room.host_id !== userId) return reply.status(403).send({ error: "Only the host can record" });

    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM recordings WHERE room_id = $1 AND status IN ('pending', 'recording')", [room.id]
    );
    if (existing) return reply.status(409).send({ error: "Recording already in progress" });

    const filePath = `${room.id}/${Date.now()}.mp4`;

    try {
      const egressInfo = await egressClient.startRoomCompositeEgress(
        `room-${room.id}`,
        { file: { filepath: `/tmp/recordings/${filePath}` } } as EncodedOutputs,
        { layout: "grid" }
      );

      await query(
        "INSERT INTO recordings (room_id, egress_id, room_name, status, file_path) VALUES ($1, $2, $3, 'recording', $4)",
        [room.id, egressInfo.egressId, room.name, filePath]
      );

      return { success: true, recording_id: egressInfo.egressId };
    } catch (err: any) {
      return reply.status(500).send({ error: "Failed to start recording", details: err.message });
    }
  });

  fastify.post("/:egressId/stop", { preHandler: [authenticate] }, async (request, reply) => {
    const { egressId } = request.params as { egressId: string };
    const recording = await queryOne<{ id: string }>(
      "SELECT id FROM recordings WHERE egress_id = $1 AND status = 'recording'", [egressId]
    );
    if (!recording) return reply.status(404).send({ error: "Active recording not found" });

    try {
      await egressClient.stopEgress(egressId);
      await query("UPDATE recordings SET status = 'completed', ended_at = now() WHERE egress_id = $1", [egressId]);
      return { success: true };
    } catch (err: any) {
      return reply.status(500).send({ error: "Failed to stop recording", details: err.message });
    }
  });

  fastify.get("/", { preHandler: [authenticate] }, async (request) => {
    const roomId = (request.query as any).roomId;
    const limit = Math.min(parseInt((request.query as any).limit || "20"), 100);

    const recordings = await query<{
      id: string; room_id: string; room_name: string; status: string;
      started_at: string; ended_at: string | null; duration_secs: number | null;
      file_path: string | null; file_size_bytes: number | null;
    }>(
      `SELECT * FROM recordings ${roomId ? "WHERE room_id = $1" : ""} ORDER BY started_at DESC LIMIT $2`,
      roomId ? [roomId, limit] : [limit]
    );

    return {
      data: recordings.map(r => ({
        id: r.id, room_id: r.room_id, room_name: r.room_name, status: r.status,
        started_at: r.started_at, ended_at: r.ended_at, duration_secs: r.duration_secs,
        download_url: r.file_path ? `/api/v1/recordings/${r.file_path}` : null,
      })),
    };
  });
}
