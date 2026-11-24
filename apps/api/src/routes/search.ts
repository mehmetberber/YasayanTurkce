import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { SearchService } from "@yasayan-turkce/search";

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Arama sorgusu boş olamaz.").max(100),
  source: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }

      const values = Array.isArray(value) ? value : [value];
      const sourceIds = values
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean);

      return sourceIds.length > 0 ? sourceIds : undefined;
    }),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  mode: z.string().trim().min(1).max(50).optional(),
  scope: z.string().trim().min(1).max(50).optional(),
});

export function registerSearchRoutes(
  app: FastifyInstance,
  searchService: SearchService,
  timeoutMs: number,
): void {
  app.get("/v1/search", async (request) => {
    const query = searchQuerySchema.parse(request.query);

    return searchService.search(query.q, {
      sourceIds: query.source,
      limit: query.limit,
      offset: query.offset,
      mode: query.mode,
      scope: query.scope,
      timeoutMs,
    });
  });
}
