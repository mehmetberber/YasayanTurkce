import type {
  DictionarySource,
  SearchResult,
  SearchSourceFailure,
  SourceSearchResult,
} from "@yasayan-turkce/domain";

import {
  SourceNotSearchableError,
  UnknownDictionarySourceError,
} from "./errors.js";
import { DictionarySourceRegistry } from "./registry.js";

export interface SearchServiceOptions {
  readonly sourceIds?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
  readonly mode?: string;
  readonly scope?: string;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  if (timeoutMs <= 0) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} zaman aşımına uğradı (${timeoutMs} ms).`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export class SearchService {
  constructor(private readonly registry: DictionarySourceRegistry) {}

  async search(
    query: string,
    options: SearchServiceOptions = {},
  ): Promise<SearchResult> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new Error("Arama sorgusu boş olamaz.");
    }

    const sources = this.resolveSources(options.sourceIds);
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const searchOptions = {
      limit: options.limit,
      offset: options.offset,
      mode: options.mode,
      scope: options.scope,
    };

    const settled = await Promise.allSettled(
      sources.map((source) =>
        withTimeout(
          source.search(normalizedQuery, searchOptions),
          timeoutMs,
          source.definition.source.name,
        ),
      ),
    );

    const groups: SourceSearchResult[] = [];
    const failures: SearchSourceFailure[] = [];

    settled.forEach((outcome, index) => {
      const source = sources[index] as DictionarySource;

      if (outcome.status === "fulfilled") {
        groups.push(outcome.value);
      } else {
        failures.push({
          source: source.definition.source,
          message: errorMessage(outcome.reason),
        });
      }
    });

    return {
      query: normalizedQuery,
      groups,
      failures,
      total: groups.reduce((sum, group) => sum + group.total, 0),
    };
  }

  private resolveSources(sourceIds?: readonly string[]): DictionarySource[] {
    if (!sourceIds || sourceIds.length === 0) {
      return this.registry
        .list()
        .filter((source) => source.definition.capabilities.search);
    }

    return sourceIds.map((sourceId) => {
      const source = this.registry.get(sourceId);
      if (!source) {
        throw new UnknownDictionarySourceError(sourceId);
      }
      if (!source.definition.capabilities.search) {
        throw new SourceNotSearchableError(sourceId);
      }
      return source;
    });
  }
}
