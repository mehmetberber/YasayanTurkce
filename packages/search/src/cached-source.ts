import type { CacheStore } from "@yasayan-turkce/cache";
import type {
  DictionaryEntry,
  DictionarySource,
  DictionarySourceDefinition,
  EntryRef,
  SearchOptions,
  SourceSearchResult,
} from "@yasayan-turkce/domain";

export interface CachedDictionarySourceOptions {
  readonly searchTtlMs?: number;
  readonly entryTtlMs?: number;
}

const DEFAULT_SEARCH_TTL_MS = 5 * 60_000;
const DEFAULT_ENTRY_TTL_MS = 60 * 60_000;

function searchCacheKey(query: string, options: SearchOptions): string {
  return JSON.stringify({
    query: query.trim(),
    limit: options.limit ?? null,
    offset: options.offset ?? null,
    mode: options.mode ?? null,
    scope: options.scope ?? null,
  });
}

export class CachedDictionarySource implements DictionarySource {
  readonly definition: DictionarySourceDefinition;
  readonly getEntry?: (ref: EntryRef) => Promise<DictionaryEntry | null>;

  private readonly sourceId: string;
  private readonly searchTtlMs: number;
  private readonly entryTtlMs: number;

  constructor(
    private readonly source: DictionarySource,
    private readonly cache: CacheStore,
    options: CachedDictionarySourceOptions = {},
  ) {
    this.definition = source.definition;
    this.sourceId = source.definition.source.id;
    this.searchTtlMs = options.searchTtlMs ?? DEFAULT_SEARCH_TTL_MS;
    this.entryTtlMs = options.entryTtlMs ?? DEFAULT_ENTRY_TTL_MS;

    if (source.getEntry) {
      const getEntry = source.getEntry.bind(source);

      this.getEntry = async (ref: EntryRef) => {
        const key = `source:${this.sourceId}:entry:${ref.sourceEntryId ?? ref.headword}`;
        const cached = await this.cache.get<DictionaryEntry>(key);
        if (cached !== undefined) {
          return cached;
        }

        const entry = await getEntry(ref);
        if (entry) {
          await this.cache.set(key, entry, this.entryTtlMs);
        }

        return entry;
      };
    }
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SourceSearchResult> {
    const key = `source:${this.sourceId}:search:${searchCacheKey(query, options)}`;
    const cached = await this.cache.get<SourceSearchResult>(key);
    if (cached !== undefined) {
      return cached;
    }

    const result = await this.source.search(query, options);
    await this.cache.set(key, result, this.searchTtlMs);
    return result;
  }
}
