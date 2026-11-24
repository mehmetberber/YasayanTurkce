import { MemoryCacheStore, type CacheStore } from "@yasayan-turkce/cache";
import {
  CachedDictionarySource,
  DictionarySourceRegistry,
} from "@yasayan-turkce/search";
import { AdsSource, GtsSource, TdkClient } from "@yasayan-turkce/tdk";

export interface SourceRegistryOptions {
  readonly tdkTimeoutMs?: number;
  readonly cache?: CacheStore;
  readonly cacheMaxEntries?: number;
  readonly searchTtlMs?: number;
  readonly entryTtlMs?: number;
}

export function createSourceRegistry(
  options: SourceRegistryOptions = {},
): DictionarySourceRegistry {
  const client = new TdkClient(options.tdkTimeoutMs);
  const cache =
    options.cache ??
    new MemoryCacheStore({ maxEntries: options.cacheMaxEntries });
  const cacheOptions = {
    searchTtlMs: options.searchTtlMs,
    entryTtlMs: options.entryTtlMs,
  };

  return new DictionarySourceRegistry()
    .register(
      new CachedDictionarySource(new GtsSource(client), cache, cacheOptions),
    )
    .register(
      new CachedDictionarySource(new AdsSource(client), cache, cacheOptions),
    );
}
