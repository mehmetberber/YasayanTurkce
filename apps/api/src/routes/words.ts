import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  SourceNotDetailedError,
  UnknownDictionarySourceError,
  type DictionarySourceRegistry,
} from "@yasayan-turkce/search";

const paramsSchema = z.object({
  sourceId: z.string().min(1),
  sourceEntryId: z.string().min(1),
});

const querySchema = z.object({
  headword: z.string().trim().min(1).max(100),
});

export function registerWordRoutes(
  app: FastifyInstance,
  registry: DictionarySourceRegistry,
): void {
  app.get("/v1/words/:sourceId/:sourceEntryId", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const query = querySchema.parse(request.query);

    const source = registry.get(params.sourceId);
    if (!source) {
      throw new UnknownDictionarySourceError(params.sourceId);
    }
    if (!source.definition.capabilities.detail || !source.getEntry) {
      throw new SourceNotDetailedError(params.sourceId);
    }

    const entry = await source.getEntry({
      sourceId: params.sourceId,
      sourceEntryId: params.sourceEntryId,
      headword: query.headword,
    });

    if (!entry) {
      return reply.code(404).send({
        error: "NOT_FOUND",
        message: "Madde bulunamadı.",
      });
    }

    return entry;
  });
}
