import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import {
  SearchService,
  SourceNotDetailedError,
  SourceNotSearchableError,
  UnknownDictionarySourceError,
  type DictionarySourceRegistry,
} from "@yasayan-turkce/search";
import { TdkApiError } from "@yasayan-turkce/tdk";

import { loadConfig, type AppConfig } from "./config.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerSearchRoutes } from "./routes/search.js";
import { registerSourceRoutes } from "./routes/sources.js";
import { registerWordRoutes } from "./routes/words.js";
import { createSourceRegistry } from "./sources.js";

export interface BuildAppOptions {
  readonly config?: AppConfig;
  readonly registry?: DictionarySourceRegistry;
  readonly searchService?: SearchService;
  readonly logger?: FastifyServerOptions["logger"];
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const app = Fastify({ logger: options.logger ?? false });

  await app.register(cors, {
    origin:
      config.corsOrigin === "*"
        ? true
        : config.corsOrigin.split(",").map((value) => value.trim()),
  });

  const registry =
    options.registry ?? createSourceRegistry(config.tdkTimeoutMs);
  const searchService = options.searchService ?? new SearchService(registry);

  registerHealthRoutes(app);
  registerSourceRoutes(app, registry);
  registerSearchRoutes(app, searchService, config.searchTimeoutMs);
  registerWordRoutes(app, registry);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "İstek doğrulanamadı.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    if (
      error instanceof UnknownDictionarySourceError ||
      error instanceof SourceNotSearchableError ||
      error instanceof SourceNotDetailedError
    ) {
      return reply.code(400).send({
        error: "INVALID_SOURCE",
        message: error.message,
      });
    }

    if (error instanceof TdkApiError) {
      return reply.code(502).send({
        error: "UPSTREAM_ERROR",
        message: error.message,
      });
    }

    request.log.error(error);
    return reply.code(500).send({
      error: "INTERNAL_ERROR",
      message: "Beklenmeyen bir hata oluştu.",
    });
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: "NOT_FOUND",
      message: `Rota bulunamadı: ${request.method} ${request.url}`,
    }),
  );

  return app;
}
