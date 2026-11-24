import { describe, expect, it, vi } from "vitest";

import type { TdkAdsResult, TdkClient } from "../client.js";
import { TdkAdsEntrySchema } from "../schema.js";
import { mapAdsSearchResult, TDK_ADS_SOURCE } from "./mapper.js";
import { AdsSource } from "./source.js";

const adsEntries = [
  TdkAdsEntrySchema.parse({
    soz_id: 36,
    sozum: "acemi katır kapı önünde yük indirir",
    atara: " acemi katır kapı önünde yük indirir indirmek",
    anlami:
      "beceriksiz ve anlayışsız kişi kendisine yaptırılan işi en önemli yerinde bırakır.",
    anahtar: "indirmek",
    turu2: "Atasözü",
    gosterim_tarihi: null,
  }),
  TdkAdsEntrySchema.parse({
    soz_id: 38,
    sozum: "acemilik çekmek",
    atara: " acemilik çekmek acemilik",
    anlami: "alışamadığı bir işte zorluk çekmek.",
    anahtar: "acemilik",
    turu2: "Deyim",
    gosterim_tarihi: null,
  }),
];

const adsResult: TdkAdsResult = {
  query: "acemi",
  requestUrl: "https://api.sozluk.gov.tr/ads?ara=acemi&searchType=web",
  fetchedAt: "2026-11-13T00:00:00.000Z",
  entries: adsEntries,
  raw: {},
};

describe("mapAdsSearchResult", () => {
  it("atasözü ve deyimleri ortak arama modeline eşler", () => {
    const mapped = mapAdsSearchResult(adsResult);

    expect(mapped.source).toEqual(TDK_ADS_SOURCE);
    expect(mapped.total).toBe(2);
    expect(mapped.hits).toHaveLength(2);
    expect(mapped.hits[0]).toMatchObject({
      sourceEntryId: "36",
      headword: "acemi katır kapı önünde yük indirir",
      kind: "proverb",
    });
    expect(mapped.hits[0].preview).toContain("beceriksiz");
    expect(mapped.hits[1]).toMatchObject({
      sourceEntryId: "38",
      headword: "acemilik çekmek",
      kind: "idiom",
    });
  });
});

describe("AdsSource", () => {
  it("sonuçları limit ve offset ile dilimler", async () => {
    const searchAds = vi.fn(async () => adsResult);
    const client = { searchAds } as unknown as TdkClient;
    const source = new AdsSource(client);

    const result = await source.search("acemi", { offset: 1, limit: 1 });

    expect(searchAds).toHaveBeenCalledWith("acemi");
    expect(result.total).toBe(2);
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].headword).toBe("acemilik çekmek");
    expect(result.nextOffset).toBeNull();
  });

  it("sonraki sayfa bilgisini hesaplar", async () => {
    const searchAds = vi.fn(async () => adsResult);
    const client = { searchAds } as unknown as TdkClient;
    const source = new AdsSource(client);

    const result = await source.search("acemi", { limit: 1 });

    expect(result.hits).toHaveLength(1);
    expect(result.nextOffset).toBe(1);
  });
});
