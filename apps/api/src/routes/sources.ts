import type { FastifyInstance } from "fastify";
import type { DictionarySourceRegistry } from "@yasayan-turkce/search";

export function registerSourceRoutes(
  app: FastifyInstance,
  registry: DictionarySourceRegistry,
): void {
  app.get("/v1/sources", async () =>
    registry.list().map((source) => ({
      ...source.definition.source,
      capabilities: source.definition.capabilities,
    })),
  );
}
