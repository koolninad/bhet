import fp from "fastify-plugin";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";

export default fp(async function websocketPlugin(fastify: FastifyInstance) {
  fastify.register(websocket);
});
