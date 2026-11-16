import { describe, expect, it, vi } from "vitest";

import type {
  TdkClient,
  TdkLookupResult,
  TdkSearchResult,
} from "../client.js";
import { TdkEntrySchema, TdkSearchResponseSchema } from "../schema.js";
import { GtsSource } from "./source.js";

const kitapEntry = TdkEntrySchema.parse({
  madde: "kitap",
  madde_id: 27874,
  lisan: "Arapça",
  lisanKoken: "kitāb",
  seskod: "k5009",
  anlamlarListe: [
    {
      anlam_id: 52009,
      anlam: "Ciltli veya ciltsiz olarak bir araya getirilmiş kâğıt yaprakların bütünü.",
      orneklerListe: [],
      ozelliklerListe: [
        {
          ozellik_id: 19,
          tam_adi: "isim",
          kisa_adi: "a.",
          tur: 3,
        },
      ],
      sozcukTuru: "isim",
      anlamEsAnlam: [],
      anlamKarsitAnlam: [],
      anlamReferans: [],
    },
  ],
  birlesikKelimeler: [{ madde_id: 27881, madde: "kitap açacağı" }],
  atasozleri: [{ madde_id: 27877, madde: "kitaba uydurmak" }],
});

const lookupResult: TdkLookupResult = {
  query: "kitap",
  requestUrl: "https://api.sozluk.gov.tr/gts-yeni?ara=kitap",
  fetchedAt: "2026-11-13T00:00:00.000Z",
  entries: [kitapEntry],
  raw: {},
};

const searchResponse = TdkSearchResponseSchema.parse({
  sorgu: {
    q: "kitap",
    mode: "start",
    scope: "madde",
    sort: "madde_asc",
    limit: 1,
    offset: 0,
    wordTypeIds: [],
    kullanimIds: [],
    alanIds: [],
    lisanKodlari: [],
  },
  toplam: 31,
  sayfa: {
    limit: 1,
    offset: 0,
    sonrakiOffset: 1,
  },
  sonuclar: [
    {
      madde_id: 27874,
      madde: "kitap",
      kac: 0,
      taki: "bı",
      lisan_kodu: 11,
      lisan_adi: "Arapça",
      wordTypes: ["isim"],
      alanlar: [],
      preview: "",
    },
  ],
});

const searchResult: TdkSearchResult = {
  query: "kitap",
  options: {
    mode: "start",
    scope: "madde",
    sort: "madde_asc",
    limit: 1,
    offset: 0,
  },
  requestUrl: "https://api.sozluk.gov.tr/gts-yeni/arama?q=kitap",
  fetchedAt: "2026-11-13T00:00:00.000Z",
  response: searchResponse,
  raw: {},
};

describe("GtsSource", () => {
  it("zengin lookup cevabını domain modeline eşler", async () => {
    const lookup = vi.fn(async () => lookupResult);
    const search = vi.fn(async () => searchResult);
    const client = { lookup, search } as unknown as TdkClient;
    const source = new GtsSource(client);

    const entry = await source.getEntry({
      sourceId: "tdk-gts",
      sourceEntryId: "27874",
      headword: "kitap",
    });

    expect(lookup).toHaveBeenCalledWith("kitap");
    expect(entry?.id).toBe("tdk-gts:27874");
    expect(entry?.relations).toContainEqual({
      type: "compound",
      target: {
        headword: "kitap açacağı",
        sourceId: "tdk-gts",
        sourceEntryId: "27881",
      },
    });
    expect(entry?.metadata.fetchedAt).toBe("2026-11-13T00:00:00.000Z");
  });

  it("yanlış kaynak kimliğini reddeder", async () => {
    const client = {
      lookup: vi.fn(),
      search: vi.fn(),
    } as unknown as TdkClient;
    const source = new GtsSource(client);

    await expect(
      source.getEntry({
        sourceId: "tdk-ads",
        headword: "kitap",
      }),
    ).rejects.toThrow("tdk-gts");
  });

  it("arama sonuçlarını ortak modele eşler", async () => {
    const lookup = vi.fn();
    const search = vi.fn(async () => searchResult);
    const client = { lookup, search } as unknown as TdkClient;
    const source = new GtsSource(client);

    const result = await source.search("kitap", { limit: 1 });

    expect(search).toHaveBeenCalledWith("kitap", {
      mode: undefined,
      scope: undefined,
      limit: 1,
      offset: undefined,
    });
    expect(result.source.id).toBe("tdk-gts");
    expect(result.total).toBe(31);
    expect(result.hits[0].headword).toBe("kitap");
  });
});
