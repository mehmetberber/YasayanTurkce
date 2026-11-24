import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import type {
  DictionaryEntry,
  DictionarySource,
  EntryRef,
  SearchHit,
  SourceRef,
  SourceSearchResult,
} from "@yasayan-turkce/domain";
import { DictionarySourceRegistry } from "@yasayan-turkce/search";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const gtsRef: SourceRef = {
  id: "tdk-gts",
  name: "Güncel Türkçe Sözlük",
  provider: "tdk",
  kind: "dictionary",
};

const adsRef: SourceRef = {
  id: "tdk-ads",
  name: "Atasözleri ve Deyimler Sözlüğü",
  provider: "tdk",
  kind: "proverb",
};

const gtsHit: SearchHit = {
  source: gtsRef,
  entryId: "tdk-gts:27874",
  sourceEntryId: "27874",
  headword: "kitap",
  preview: null,
  partOfSpeech: ["isim"],
  language: "Arapça",
  domains: [],
  kind: "entry",
};

const adsHit: SearchHit = {
  source: adsRef,
  entryId: "tdk-ads:36",
  sourceEntryId: "36",
  headword: "acemi katır kapı önünde yük indirir",
  preview:
    "beceriksiz ve anlayışsız kişi kendisine yaptırılan işi en önemli yerinde bırakır.",
  partOfSpeech: [],
  language: null,
  domains: [],
  kind: "proverb",
};

const gtsResult: SourceSearchResult = {
  source: gtsRef,
  hits: [gtsHit],
  total: 1,
  nextOffset: null,
};

const adsResult: SourceSearchResult = {
  source: adsRef,
  hits: [adsHit],
  total: 1,
  nextOffset: null,
};

const entry: DictionaryEntry = {
  id: "tdk-gts:27874",
  source: gtsRef,
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

const gtsSearch = vi.fn(async () => gtsResult);
const adsSearch = vi.fn(async () => adsResult);
const gtsGetEntry = vi.fn(async (ref: EntryRef) =>
  ref.sourceEntryId === "27874" ? entry : null,
);

const gtsSource: DictionarySource = {
  definition: {
    source: gtsRef,
    capabilities: {
      search: true,
      detail: true,
      pagination: true,
      modes: ["start"],
      scopes: ["madde"],
    },
  },
  search: gtsSearch,
  getEntry: gtsGetEntry,
};

const adsSource: DictionarySource = {
  definition: {
    source: adsRef,
    capabilities: {
      search: true,
      detail: false,
      pagination: false,
    },
  },
  search: adsSearch,
};

let app: FastifyInstance;

beforeAll(async () => {
  const registry = new DictionarySourceRegistry()
    .register(gtsSource)
    .register(adsSource);

  app = await buildApp({
    registry,
    config: loadConfig({}),
    logger: false,
  });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

async function getJson(url: string): Promise<{
  statusCode: number;
  body: any;
}> {
  const response = await app.inject({ method: "GET", url });
  return {
    statusCode: response.statusCode,
    body: response.json(),
  };
}

describe("API", () => {
  it("health endpoint'i çalışır", async () => {
    const { statusCode, body } = await getJson("/health");

    expect(statusCode).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
  });

  it("kaynakları yetenekleriyle listeler", async () => {
    const { statusCode, body } = await getJson("/v1/sources");

    expect(statusCode).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe("tdk-gts");
    expect(body[1].id).toBe("tdk-ads");
    expect(body[0].capabilities.search).toBe(true);
  });

  it("tüm kaynaklarda arar ve sonuçları gruplar", async () => {
    const { statusCode, body } = await getJson("/v1/search?q=kitap&limit=5");

    expect(statusCode).toBe(200);
    expect(body.groups).toHaveLength(2);
    expect(body.groups[0].source.id).toBe("tdk-gts");
    expect(body.groups[1].source.id).toBe("tdk-ads");
    expect(body.total).toBe(2);
    expect(body.failures).toEqual([]);
    expect(gtsSearch).toHaveBeenCalledWith(
      "kitap",
      expect.objectContaining({ limit: 5, offset: 0 }),
    );
  });

  it("source parametresiyle kaynak filtreler", async () => {
    const { statusCode, body } = await getJson(
      "/v1/search?q=kitap&source=tdk-gts",
    );

    expect(statusCode).toBe(200);
    expect(body.groups).toHaveLength(1);
    expect(body.groups[0].source.id).toBe("tdk-gts");
    expect(adsSearch).not.toHaveBeenCalled();
  });

  it("virgüllü source parametresini destekler", async () => {
    const { statusCode, body } = await getJson(
      "/v1/search?q=kitap&source=tdk-gts,tdk-ads",
    );

    expect(statusCode).toBe(200);
    expect(body.groups).toHaveLength(2);
  });

  it("boş sorguyu 400 ile reddeder", async () => {
    const { statusCode, body } = await getJson("/v1/search?q=");

    expect(statusCode).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("bilinmeyen kaynağı 400 ile reddeder", async () => {
    const { statusCode, body } = await getJson(
      "/v1/search?q=kitap&source=tdk-yok",
    );

    expect(statusCode).toBe(400);
    expect(body.error).toBe("INVALID_SOURCE");
  });

  it("kelime detayını döndürür", async () => {
    const { statusCode, body } = await getJson(
      "/v1/words/tdk-gts/27874?headword=kitap",
    );

    expect(statusCode).toBe(200);
    expect(body.id).toBe("tdk-gts:27874");
    expect(body.headword).toBe("kitap");
    expect(gtsGetEntry).toHaveBeenCalledWith({
      sourceId: "tdk-gts",
      sourceEntryId: "27874",
      headword: "kitap",
    });
  });

  it("headword olmadan detay isteğini 400 ile reddeder", async () => {
    const { statusCode, body } = await getJson("/v1/words/tdk-gts/27874");

    expect(statusCode).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("bulunmayan madde için 404 döndürür", async () => {
    const { statusCode, body } = await getJson(
      "/v1/words/tdk-gts/999?headword=yok",
    );

    expect(statusCode).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("detay desteklemeyen kaynak için 400 döndürür", async () => {
    const { statusCode, body } = await getJson(
      "/v1/words/tdk-ads/36?headword=acemi",
    );

    expect(statusCode).toBe(400);
    expect(body.error).toBe("INVALID_SOURCE");
  });
});
