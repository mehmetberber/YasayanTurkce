import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  HOST: z.string().min(1).default("127.0.0.1"),
  CORS_ORIGIN: z.string().min(1).default("*"),
  TDK_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(60_000),
  SEARCH_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(120_000)
    .default(45_000),
});

export interface AppConfig {
  readonly port: number;
  readonly host: string;
  readonly corsOrigin: string;
  readonly tdkTimeoutMs: number;
  readonly searchTimeoutMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);

  return {
    port: parsed.PORT,
    host: parsed.HOST,
    corsOrigin: parsed.CORS_ORIGIN,
    tdkTimeoutMs: parsed.TDK_TIMEOUT_MS,
    searchTimeoutMs: parsed.SEARCH_TIMEOUT_MS,
  };
}
