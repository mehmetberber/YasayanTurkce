import { describe, expect, it } from "vitest";

import { TdkEntrySchema, TdkSearchResponseSchema } from "../schema.js";
import type { TdkSearchResult } from "../client.js";
import { mapGtsEntry, mapGtsSearchResult, TDK_GTS_SOURCE } from "./mapper.js";

const kitapEntry = TdkEntrySchema.parse({
  madde: "kitap",
  madde_id: 27874,
  lisan: "Arapça",
  lisanKoken: "kitāb",
  lisanKodu: 11,
  seskod: "k5009",
  ozelMi: false,
  cogulMu: false,
  egikMi: false,
  anlamlarListe: [
    {
      anlam_id: 52009,
      anlam:
        "Ciltli veya ciltsiz olarak bir araya getirilmiş, basılı veya yazılı kâğıt yaprakların bütünü.",
      orneklerListe: [
        {
          ornek_id: 51732,
          ornek:
            "Ama ben, bir kitap üzerine bir fikir edinmek istedim mi o kitabı kendim okurum.",
          yazar: [
            {
              yazar_id: 42,
              tam_adi: "Nurullah Ataç",
              kisa_adi: "N. Ataç",
            },
          ],
        },
      ],
      ozelliklerListe: [
        {
          ozellik_id: 19,
          tam_adi: "isim",
          kisa_adi: "a.",
          tur: 3,
        },
      ],
      sozcukTuru: "isim",
      anlamEsAnlam: [
        {
          anlam_id: 52009,
          sira: 1,
          deger: "betik",
          hedef_madde_id: 10281,
        },
      ],
      anlamKarsitAnlam: [],
      anlamReferans: [],
    },
    {
      anlam_id: 52010,
      anlam: "Herhangi bir konuda yazılmış eser.",
      orneklerListe: [],
      ozelliklerListe: [],
      sozcukTuru: "isim",
      anlamEsAnlam: [],
      anlamKarsitAnlam: [],
      anlamReferans: [],
    },
  ],
  birlesikKelimeler: [
    {
      madde_id: 27881,
      madde: "kitap açacağı",
    },
  ],
  atasozleri: [
    {
      madde_id: 27877,
      madde: "kitaba (veya kitabına) uydurmak",
    },
  ],
});

const abaEntries = [
  TdkEntrySchema.parse({
    madde: "aba",
    madde_id: 74625,
    lisan: null,
    anlamlarListe: [
      {
        anlam_id: 101176,
        anlam: null,
        orneklerListe: [],
        ozelliklerListe: [],
        anlamEsAnlam: [],
        anlamKarsitAnlam: [],
        anlamReferans: [
          {
            id: 4,
            anlam_id: 101176,
            hedef_madde: "abla",
            hedef_madde_id: 6267,
            gosterim: "ok",
          },
        ],
      },
    ],
  }),
  TdkEntrySchema.parse({
    madde: "aba",
    madde_id: 6173,
    lisan: "Arapça",
    lisanKoken: "ʿabā",
    anlamlarListe: [
      {
        anlam_id: 38,
        anlam: "Yünün dövülmesiyle yapılan kalın ve kaba kumaş.",
        orneklerListe: [],
        ozelliklerListe: [],
        anlamEsAnlam: [],
        anlamKarsitAnlam: [],
        anlamReferans: [],
      },
    ],
  }),
];

const searchResponse = TdkSearchResponseSchema.parse({
  sorgu: {
    q: "kitap",
    mode: "start",
    scope: "madde",
    sort: "madde_asc",
    limit: 2,
    offset: 0,
    wordTypeIds: [],
    kullanimIds: [],
    alanIds: [],
    lisanKodlari: [],
  },
  toplam: 31,
  sayfa: {
    limit: 2,
    offset: 0,
    sonrakiOffset: 2,
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
    {
      madde_id: 27881,
      madde: "kitap açacağı",
      kac: 0,
      taki: null,
      lisan_kodu: 0,
      lisan_adi: null,
      wordTypes: ["isim"],
      alanlar: [
        {
          ozellik_id: 69,
          ad: "eğitim",
        },
      ],
      preview:
        "Sayfalarının bir veya iki kenarı katlı olan kitapları açmak amacıyla kullanılan araç.",
    },
  ],
});

const searchResult: TdkSearchResult = {
  query: "kitap",
  options: {
    mode: "start",
    scope: "madde",
    sort: "madde_asc",
    limit: 2,
    offset: 0,
  },
  requestUrl: "https://api.sozluk.gov.tr/gts-yeni/arama?q=kitap",
  fetchedAt: "2026-11-13T00:00:00.000Z",
  response: searchResponse,
  raw: {},
};

describe("mapGtsEntry", () => {
  it("temel alanları ve madde kimliğini eşler", () => {
    const mapped = mapGtsEntry(kitapEntry, {
      fetchedAt: "2026-11-13T00:00:00.000Z",
    });

    expect(mapped.id).toBe("tdk-gts:27874");
    expect(mapped.source).toEqual(TDK_GTS_SOURCE);
    expect(mapped.sourceEntryId).toBe("27874");
    expect(mapped.headword).toBe("kitap");
    expect(mapped.searchKey).toBe("kitap");
    expect(mapped.language).toBe("Arapça");
    expect(mapped.origin).toBe("kitāb");
    expect(mapped.metadata.sourceUrl).toBe(
      "https://sozluk.gov.tr/kelime/kitap",
    );
    expect(mapped.metadata.fetchedAt).toBe("2026-11-13T00:00:00.000Z");
    expect(mapped.metadata.attribution).toContain("TDK");
  });

  it("anlamları, örnekleri ve ilişkileri eşler", () => {
    const mapped = mapGtsEntry(kitapEntry);

    expect(mapped.senses).toHaveLength(2);

    const firstSense = mapped.senses[0];
    expect(firstSense.definition).toContain("Ciltli veya ciltsiz");
    expect(firstSense.partOfSpeech).toContain("isim");
    expect(firstSense.examples).toHaveLength(1);
    expect(firstSense.examples[0].authors[0].fullName).toBe("Nurullah Ataç");
    expect(firstSense.relations).toContainEqual({
      type: "synonym",
      target: {
        headword: "betik",
        sourceId: "tdk-gts",
        sourceEntryId: "10281",
      },
    });

    expect(mapped.relations).toContainEqual({
      type: "compound",
      target: {
        headword: "kitap açacağı",
        sourceId: "tdk-gts",
        sourceEntryId: "27881",
      },
    });
    expect(mapped.relations).toContainEqual({
      type: "proverb",
      target: {
        headword: "kitaba (veya kitabına) uydurmak",
        sourceId: "tdk-gts",
        sourceEntryId: "27877",
      },
    });
    expect(mapped.media).toContainEqual({
      type: "audio",
      kind: "pronunciation",
      url: "https://api.sozluk.gov.tr/ses/k5009.wav",
    });
  });

  it("null tanımı ve referans ilişkisini korur", () => {
    const mapped = mapGtsEntry(abaEntries[0]);

    expect(mapped.senses[0].definition).toBeNull();
    expect(mapped.senses[0].relations).toContainEqual({
      type: "reference",
      target: {
        headword: "abla",
        sourceId: "tdk-gts",
        sourceEntryId: "6267",
      },
    });
  });

  it("aynı başlıklı farklı maddeleri ayrı kimliklerle eşler", () => {
    const first = mapGtsEntry(abaEntries[0]);
    const second = mapGtsEntry(abaEntries[1]);

    expect(first.id).toBe("tdk-gts:74625");
    expect(second.id).toBe("tdk-gts:6173");
    expect(first.id).not.toBe(second.id);
  });
});

describe("mapGtsSearchResult", () => {
  it("arama sonuçlarını ortak modele eşler", () => {
    const mapped = mapGtsSearchResult(searchResult);

    expect(mapped.source).toEqual(TDK_GTS_SOURCE);
    expect(mapped.total).toBe(31);
    expect(mapped.nextOffset).toBe(2);
    expect(mapped.hits).toHaveLength(2);

    expect(mapped.hits[0]).toMatchObject({
      entryId: "tdk-gts:27874",
      sourceEntryId: "27874",
      headword: "kitap",
      partOfSpeech: ["isim"],
      language: "Arapça",
      kind: "entry",
    });
    expect(mapped.hits[1].domains).toEqual(["eğitim"]);
    expect(mapped.hits[1].preview).toContain("Sayfalarının");
  });
});
