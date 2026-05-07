import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { query, queryOne } from "../db/pool.js";
import { authenticate, getUser } from "../plugins/auth.js";
import { createLiveKitRoom, generateToken, muteAllParticipants, roomService } from "../services/livekit.js";

const createRoomSchema = z.object({
  name: z.string().min(1).max(200),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  max_participants: z.number().int().min(2).max(100).optional(),
  password: z.string().min(1).max(50).optional(),
  recording_enabled: z.boolean().optional(),
  transcription_enabled: z.boolean().optional(),
});

const joinSchema = z.object({
  display_name: z.string().min(1).max(100),
  password: z.string().optional(),
});

function generateSlug(): string {
  return crypto.randomBytes(4).toString("hex");
}

export default async function roomRoutes(fastify: FastifyInstance) {
  fastify.post("/", { preHandler: [authenticate] }, async (request, reply) => {
    const body = createRoomSchema.parse(request.body);
    const { id: userId } = getUser(request);

    let slug = generateSlug();
    for (let i = 0; i < 10; i++) {
      if (!(await queryOne("SELECT id FROM rooms WHERE slug = $1", [slug]))) break;
      slug = generateSlug();
    }

    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;
    const room = await queryOne<{
      id: string; slug: string; name: string; host_id: string;
      scheduled_at: string | null; duration_minutes: number | null;
      max_participants: number; password_hash: string | null;
      recording_enabled: boolean; transcription_enabled: boolean;
      status: string; created_at: string;
    }>(
      `INSERT INTO rooms (slug, host_id, name, scheduled_at, duration_minutes, max_participants, password_hash, recording_enabled, transcription_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [slug, userId, body.name, body.scheduled_at || null, body.duration_minutes || null,
       body.max_participants || 25, passwordHash, body.recording_enabled ?? false, body.transcription_enabled ?? false]
    );

    await createLiveKitRoom(`room-${room!.id}`).catch(() => {});

    return reply.status(201).send({
      id: room!.id, slug: room!.slug, name: room!.name, host_id: room!.host_id,
      scheduled_at: room!.scheduled_at, duration_minutes: room!.duration_minutes,
      max_participants: room!.max_participants, password: !!room!.password_hash,
      recording_enabled: room!.recording_enabled, transcription_enabled: room!.transcription_enabled,
      status: room!.status, participant_count: 0, created_at: room!.created_at,
    });
  });

  fastify.get("/", { preHandler: [authenticate] }, async (request) => {
    const { id: userId } = getUser(request);
    const limit = Math.min(parseInt((request.query as any).limit || "20"), 100);
    const offset = parseInt((request.query as any).offset || "0");
    const status = (request.query as any).status;

    let where = "WHERE host_id = $1";
    const params: unknown[] = [userId];
    if (status) { where += " AND status = $2"; params.push(status); }

    const rooms = await query<{
      id: string; slug: string; name: string; host_id: string;
      scheduled_at: string | null; duration_minutes: number | null;
      max_participants: number; password_hash: string | null;
      recording_enabled: boolean; transcription_enabled: boolean;
      status: string; created_at: string; participant_count: number;
    }>(
      `SELECT r.*, COUNT(p.id) AS participant_count
       FROM rooms r LEFT JOIN participants p ON p.room_id = r.id AND p.left_at IS NULL
       ${where} GROUP BY r.id ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params
    );
    const total = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM rooms ${where}`, params);

    return { data: rooms.map(r => ({ ...r, password: !!r.password_hash, password_hash: undefined })), total: parseInt(total?.count || "0") };
  });

  fastify.get("/:slug", { preHandler: [authenticate] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const room = await queryOne<{
      id: string; slug: string; name: string; host_id: string;
      scheduled_at: string | null; duration_minutes: number | null;
      max_participants: number; password_hash: string | null;
      recording_enabled: boolean; transcription_enabled: boolean;
      status: string; created_at: string;
    }>("SELECT * FROM rooms WHERE slug = $1", [slug]);

    if (!room) return reply.status(404).send({ error: "Room not found" });
    const participants = await query<{ identity: string; display_name: string; role: string; joined_at: string }>(
      "SELECT identity, display_name, role, joined_at FROM participants WHERE room_id = $1 AND left_at IS NULL", [room.id]
    );
    return { ...room, password: !!room.password_hash, password_hash: undefined, participant_count: participants.length, participants };
  });

  fastify.post("/:slug/join", { preHandler: [authenticate] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = joinSchema.parse(request.body);
    const { id: userId } = getUser(request);

    const room = await queryOne<{
      id: string; slug: string; host_id: string;
      password_hash: string | null; max_participants: number; status: string;
    }>("SELECT * FROM rooms WHERE slug = $1", [slug]);

    if (!room) return reply.status(404).send({ error: "Room not found" });
    if (room.status !== "active") return reply.status(403).send({ error: "Room is not active" });
    if (room.password_hash && !(body.password && await bcrypt.compare(body.password, room.password_hash))) {
      return reply.status(403).send({ error: "Invalid room password" });
    }

    const count = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM participants WHERE room_id = $1 AND left_at IS NULL", [room.id]);
    if (parseInt(count?.count || "0") >= room.max_participants) return reply.status(403).send({ error: "Room is full" });

    const identity = `user-${userId}`;
    const isHost = room.host_id === userId;

    await query(
      `INSERT INTO participants (room_id, user_id, identity, display_name, role) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (room_id, identity) DO UPDATE SET left_at = NULL, joined_at = now()`,
      [room.id, userId, identity, body.display_name, isHost ? "host" : "participant"]
    );

    const { token, serverUrl } = await generateToken(`room-${room.id}`, identity, {
      metadata: JSON.stringify({ displayName: body.display_name, role: isHost ? "host" : "participant" }),
    });
    return { token, server_url: serverUrl, room_id: slug, identity };
  });

  fastify.post("/:slug/approve/:identity", { preHandler: [authenticate] }, async (request, reply) => {
    const { slug, identity } = request.params as { slug: string; identity: string };
    const { id: userId } = getUser(request);
    const room = await queryOne<{ id: string; host_id: string }>("SELECT id, host_id FROM rooms WHERE slug = $1", [slug]);
    if (!room) return reply.status(404).send({ error: "Room not found" });
    if (room.host_id !== userId) return reply.status(403).send({ error: "Only the host can approve" });
    await query("UPDATE participants SET role = 'participant' WHERE room_id = $1 AND identity = $2", [room.id, identity]);
    return { success: true };
  });

  fastify.post("/:slug/deny/:identity", { preHandler: [authenticate] }, async (request, reply) => {
    const { slug, identity } = request.params as { slug: string; identity: string };
    const { id: userId } = getUser(request);
    const room = await queryOne<{ id: string; host_id: string }>("SELECT id, host_id FROM rooms WHERE slug = $1", [slug]);
    if (!room) return reply.status(404).send({ error: "Room not found" });
    if (room.host_id !== userId) return reply.status(403).send({ error: "Only the host can deny" });
    await roomService.removeParticipant(`room-${room.id}`, identity);
    await query("UPDATE participants SET left_at = now() WHERE room_id = $1 AND identity = $2", [room.id, identity]);
    return { success: true };
  });

  fastify.post("/:slug/mute-all", { preHandler: [authenticate] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { id: userId } = getUser(request);
    const room = await queryOne<{ id: string; host_id: string }>("SELECT id, host_id FROM rooms WHERE slug = $1", [slug]);
    if (!room) return reply.status(404).send({ error: "Room not found" });
    if (room.host_id !== userId) return reply.status(403).send({ error: "Only the host can mute all" });

    const results = await muteAllParticipants(`room-${room.id}`);
    return { success: true, muted_count: results.length };
  });

  fastify.post("/:slug/kick/:identity", { preHandler: [authenticate] }, async (request, reply) => {
    const { slug, identity } = request.params as { slug: string; identity: string };
    const { id: userId } = getUser(request);
    const room = await queryOne<{ id: string; host_id: string }>("SELECT id, host_id FROM rooms WHERE slug = $1", [slug]);
    if (!room) return reply.status(404).send({ error: "Room not found" });
    if (room.host_id !== userId) return reply.status(403).send({ error: "Only the host can kick participants" });

    await roomService.removeParticipant(`room-${room.id}`, identity);
    await query("UPDATE participants SET left_at = now() WHERE room_id = $1 AND identity = $2", [room.id, identity]);
    return { success: true };
  });
}
