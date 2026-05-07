import bcrypt from "bcryptjs";
import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { query, queryOne } from "../db/pool.js";
import { authenticate, getUser } from "../plugins/auth.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await queryOne("SELECT id FROM users WHERE email = $1", [body.email]);
    if (existing) return reply.status(409).send({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await queryOne<{ id: string; email: string; name: string; avatar_url: string | null }>(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, avatar_url",
      [body.email, passwordHash, body.name]
    );

    const token = fastify.jwt.sign({ id: user!.id, email: user!.email, name: user!.name });
    return reply.status(201).send({ token, user });
  });

  fastify.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await queryOne<{ id: string; email: string; name: string; password_hash: string; avatar_url: string | null }>(
      "SELECT id, email, name, password_hash, avatar_url FROM users WHERE email = $1", [body.email]
    );

    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email, name: user.name });
    return { token, user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url } };
  });

  fastify.get("/me", { preHandler: [authenticate] }, async (request) => {
    const { id } = getUser(request);
    const user = await queryOne<{ id: string; email: string; name: string; avatar_url: string | null }>(
      "SELECT id, email, name, avatar_url FROM users WHERE id = $1", [id]
    );
    return { user };
  });
}
