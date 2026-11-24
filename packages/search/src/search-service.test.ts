import { describe, expect, it } from "vitest";

import type {
  DictionarySource,
  SearchHit,
  SourceRef,
  SourceSearchResult,
} from "@yasayan-turkce/domain";

import {
  SourceNotSearchableError,
  UnknownDictionarySourceError,
} from "./errors.js";
import { DictionarySourceRegistry } from "./registry.js";
import { SearchService } from "./search-service.js";

const gtsSourceRef: SourceRef = {
  id: "tdk-gts",
  name: "Güncel Türkçe Sözlük",
  provider: "tdk",
  kind: "dictionary",
};

const adsSourceRef: SourceRef = {
  id: "tdk-ads",
  name: "Atasözleri ve Deyimler Sözlüğü",
  provider: "tdk",
  kind: "proverb",
};

function makeHit(source: SourceRef, headword: string): SearchHit {
  return {
    source,
    entryId: `${source.id}:1`,
    sourceEntryId: "1",
    headword,
    preview: null,
    partOfSpeech: [],
    language: null,
    domains: [],
    kind: source.kind === "proverb" ? "proverb" : "entry",
  };
}

function makeResult(
  source: SourceRef,
  hits: SearchHit[],
  total = hits.length,
): SourceSearchResult {
  return {
    source,
    hits,
    total,
    nextOffset: null,
  };
}

function makeSource(
  ref: SourceRef,
  search: DictionarySource["search"],
  searchable = true,
): DictionarySource {
  return {
    definition: {
      source: ref,
      capabilities: {
        search: searchable,
        detail: false,
        pagination: false,
      },
    },
    search,
  };
}

describe("SearchService", () => {
  it("tüm kaynakları kayıt sırasıyla arar ve toplamı hesaplar", async () => {
    const registry = new DictionarySourceRegistry();
    const gts = makeSource(gtsSourceRef, async () =>
      makeResult(gtsSourceRef, [makeHit(gtsSourceRef, "kitap")], 10),
    );
    const ads = makeSource(adsSourceRef, async () =>
      makeResult(adsSourceRef, [makeHit(adsSourceRef, "kitap kurdu")], 3),
    );
    registry.register(gts).register(ads);
    const service = new SearchService(registry);

    const result = await service.search("kitap");

    expect(result.groups.map((group) => group.source.id)).toEqual([
      "tdk-gts",
      "tdk-ads",
    ]);
    expect(result.total).toBe(13);
    expect(result.failures).toEqual([]);
  });

  it("seçilen kaynaklarla sınırlar", async () => {
    const registry = new DictionarySourceRegistry();
    const gts = makeSource(gtsSourceRef, async () => {
      throw new Error("GTS çağrılmamalıydı");
    });
    const ads = makeSource(adsSourceRef, async () =>
      makeResult(adsSourceRef, [makeHit(adsSourceRef, "acemi")], 1),
    );
    registry.register(gts).register(ads);
    const service = new SearchService(registry);

    const result = await service.search("acemi", {
      sourceIds: ["tdk-ads"],
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].source.id).toBe("tdk-ads");
    expect(result.failures).toEqual([]);
  });

  it("bir kaynak hata verse de diğerlerini döndürür", async () => {
    const registry = new DictionarySourceRegistry();
    const gts = makeSource(gtsSourceRef, async () =>
      makeResult(gtsSourceRef, [makeHit(gtsSourceRef, "kitap")], 5),
    );
    const ads = makeSource(adsSourceRef, async () => {
      throw new Error("ADS servisi kapalı");
    });
    registry.register(gts).register(ads);
    const service = new SearchService(registry);

    const result = await service.search("kitap");

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].source.id).toBe("tdk-gts");
    expect(result.total).toBe(5);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].source.id).toBe("tdk-ads");
    expect(result.failures[0].message).toContain("ADS servisi kapalı");
  });

  it("bilinmeyen kaynağı reddeder", async () => {
    const registry = new DictionarySourceRegistry();
    const service = new SearchService(registry);

    await expect(
      service.search("kitap", { sourceIds: ["tdk-yok"] }),
    ).rejects.toBeInstanceOf(UnknownDictionarySourceError);
  });

  it("aramayı desteklemeyen kaynağı reddeder", async () => {
    const registry = new DictionarySourceRegistry();
    const source = makeSource(
      gtsSourceRef,
      async () => makeResult(gtsSourceRef, []),
      false,
    );
    registry.register(source);
    const service = new SearchService(registry);

    await expect(
      service.search("kitap", { sourceIds: ["tdk-gts"] }),
    ).rejects.toBeInstanceOf(SourceNotSearchableError);
  });

  it("yavaş kaynak için zaman aşımı uygular", async () => {
    const registry = new DictionarySourceRegistry();
    const slowSource = makeSource(
      gtsSourceRef,
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve(makeResult(gtsSourceRef, [makeHit(gtsSourceRef, "geç")])),
            50,
          );
        }),
    );
    registry.register(slowSource);
    const service = new SearchService(registry);

    const result = await service.search("kitap", { timeoutMs: 5 });

    expect(result.groups).toHaveLength(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].message).toContain("zaman aşımı");
  });

  it("boş sorguyu reddeder", async () => {
    const registry = new DictionarySourceRegistry();
    const service = new SearchService(registry);

    await expect(service.search("   ")).rejects.toThrow("boş olamaz");
  });
});
