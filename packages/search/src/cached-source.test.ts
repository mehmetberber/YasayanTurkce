import { describe, expect, it, vi } from "vitest";

import { MemoryCacheStore } from "@yasayan-turkce/cache";
import type {
  DictionaryEntry,
  DictionarySource,
  SearchHit,
  SourceRef,
  SourceSearchResult,
} from "@yasayan-turkce/domain";

import { CachedDictionarySource } from "./cached-source.js";

const sourceRef: SourceRef = {
  id: "tdk-gts",
  name: "Güncel Türkçe Sözlük",
  provider: "tdk",
  kind: "dictionary",
};

const hit: SearchHit = {
  source: sourceRef,
  entryId: "tdk-gts:27874",
  sourceEntryId: "27874",
  headword: "kitap",
  preview: null,
  partOfSpeech: ["isim"],
  language: "Arapça",
  domains: [],
  kind: "entry",
};

const searchResult: SourceSearchResult = {
  source: sourceRef,
  hits: [hit],
  total: 1,
  nextOffset: null,
};

const entry: DictionaryEntry = {
  id: "tdk-gts:27874",
  source: sourceRef,
  sourceEntryId: "27874",
  headword: "kitap",
  searchKey: "kitap",
  language: "Arapça",
  languageCode: 11,
  origin: "kitāb",
  pronunciation: null,
  hyphenation: null,
  isProperNoun: false,
  isPlural: false,
  isOblique: false,
  senses: [],
  relations: [],
  media: [],
  metadata: {
    attribution: "test",
  },
};

function createSource(detail = true): {
  source: DictionarySource;
  search: ReturnType<typeof vi.fn>;
  getEntry: ReturnType<typeof vi.fn>;
} {
  const search = vi.fn(async () => searchResult);
  const getEntry = vi.fn(async () => entry);

  const source: DictionarySource = {
    definition: {
      source: sourceRef,
      capabilities: {
        search: true,
        detail,
        pagination: true,
      },
    },
    search,
    ...(detail ? { getEntry } : {}),
  };

  return { source, search, getEntry };
}

describe("CachedDictionarySource", () => {
  it("aynı arama için kaynağı bir kez çağırır", async () => {
    const { source, search } = createSource();
    const cached = new CachedDictionarySource(source, new MemoryCacheStore());

    const first = await cached.search("kitap", { limit: 5 });
    const second = await cached.search("kitap", { limit: 5 });

    expect(search).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("farklı arama seçenekleri için ayrı cache kullanır", async () => {
    const { source, search } = createSource();
    const cached = new CachedDictionarySource(source, new MemoryCacheStore());

    await cached.search("kitap", { limit: 5 });
    await cached.search("kitap", { limit: 10 });

    expect(search).toHaveBeenCalledTimes(2);
  });

  it("madde detayını cache'ler", async () => {
    const { source, getEntry } = createSource();
    const cached = new CachedDictionarySource(source, new MemoryCacheStore());
    const ref = {
      sourceId: sourceRef.id,
      sourceEntryId: "27874",
      headword: "kitap",
    };

    const first = await cached.getEntry?.(ref);
    const second = await cached.getEntry?.(ref);

    expect(getEntry).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("detay desteklemeyen kaynakta getEntry tanımlamaz", () => {
    const { source } = createSource(false);
    const cached = new CachedDictionarySource(source, new MemoryCacheStore());

    expect(cached.getEntry).toBeUndefined();
  });
});
