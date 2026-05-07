import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { config } from "../config.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  return (request as any).jwtVerify().catch(() => {
    reply.status(401).send({ error: "Invalid or missing token" });
  });
}

export function getUser(request: any): { id: string; email: string; name: string } {
  const user = request.user;
  return {
    id: typeof user?.id === "string" ? user.id : String(user?.id || ""),
    email: user?.email || "",
    name: user?.name || "",
  };
}

export default fp(
  async function authPlugin(fastify: FastifyInstance) {
    fastify.register(jwt, { secret: config.jwtSecret });
    fastify.decorate("authenticate", authenticate);
  },
  { name: "bhet-auth" }
);
