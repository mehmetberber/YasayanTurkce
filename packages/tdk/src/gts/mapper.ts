import {
  buildEntryId,
  toSearchKey,
  type DictionaryEntry,
  type Example,
  type MediaAsset,
  type PersonRef,
  type Relation,
  type SearchHit,
  type Sense,
  type SourceRef,
  type SourceSearchResult,
  type WordRef,
} from "@yasayan-turkce/domain";

import type { TdkSearchResult } from "../client.js";
import type {
  TdkAuthor,
  TdkEntry,
  TdkExample,
  TdkProperty,
  TdkSearchResultItem,
  TdkSense,
  TdkSenseReference,
  TdkSenseRelation,
} from "../schema.js";

export const TDK_GTS_SOURCE: SourceRef = {
  id: "tdk-gts",
  name: "Güncel Türkçe Sözlük",
  provider: "tdk",
  kind: "dictionary",
};

const TDK_GTS_WEB_BASE = "https://sozluk.gov.tr/kelime";
const TDK_AUDIO_BASE = "https://api.sozluk.gov.tr/ses";
const TDK_GTS_ATTRIBUTION = "Kaynak: TDK Güncel Türkçe Sözlük";

export interface MapGtsEntryOptions {
  readonly fetchedAt?: string;
}

function uniqueStrings(values: readonly (string | null | undefined)[]): string[] {
  const result = new Set<string>();

  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      result.add(trimmed);
    }
  }

  return [...result];
}

function propertyValues(properties: readonly TdkProperty[], tur: number): string[] {
  return uniqueStrings(
    properties
      .filter((property) => property.tur === tur)
      .map((property) => property.tam_adi),
  );
}

function mapAuthor(author: TdkAuthor): PersonRef | null {
  const fullName = author.tam_adi?.trim() || author.kisa_adi?.trim();
  if (!fullName) {
    return null;
  }

  return {
    id: String(author.yazar_id),
    fullName,
    ...(author.kisa_adi ? { shortName: author.kisa_adi } : {}),
  };
}

function mapExample(example: TdkExample, senseId: string): Example | null {
  const text = example.ornek?.trim();
  if (!text) {
    return null;
  }

  return {
    id: `${senseId}:example:${example.ornek_id}`,
    text,
    authors: example.yazar
      .map(mapAuthor)
      .filter((author): author is PersonRef => author !== null),
  };
}

function mapWordRef(
  headword: string | null | undefined,
  sourceEntryId: number | null | undefined,
): WordRef | null {
  const normalizedHeadword = headword?.trim();
  if (!normalizedHeadword) {
    return null;
  }

  return {
    headword: normalizedHeadword,
    sourceId: TDK_GTS_SOURCE.id,
    ...(sourceEntryId != null ? { sourceEntryId: String(sourceEntryId) } : {}),
  };
}

function mapSenseRelation(
  relation: TdkSenseRelation,
  type: "synonym" | "antonym",
): Relation | null {
  const target = mapWordRef(relation.deger, relation.hedef_madde_id);
  return target ? { type, target } : null;
}

function mapSenseReference(reference: TdkSenseReference): Relation | null {
  const target = mapWordRef(reference.hedef_madde, reference.hedef_madde_id);
  return target ? { type: "reference", target } : null;
}

function mapSenseRelations(sense: TdkSense): Relation[] {
  const relations: Relation[] = [];

  for (const relation of sense.anlamEsAnlam) {
    const mapped = mapSenseRelation(relation, "synonym");
    if (mapped) {
      relations.push(mapped);
    }
  }

  for (const relation of sense.anlamKarsitAnlam) {
    const mapped = mapSenseRelation(relation, "antonym");
    if (mapped) {
      relations.push(mapped);
    }
  }

  for (const reference of sense.anlamReferans) {
    const mapped = mapSenseReference(reference);
    if (mapped) {
      relations.push(mapped);
    }
  }

  return relations;
}

function mapSense(sense: TdkSense, entryId: string, order: number): Sense {
  const senseId = `${entryId}:sense:${sense.anlam_id}`;
  const properties = sense.ozelliklerListe;

  return {
    id: senseId,
    sourceSenseId: String(sense.anlam_id),
    order,
    definition: sense.anlam?.trim() || null,
    partOfSpeech: uniqueStrings([
      sense.sozcukTuru,
      ...propertyValues(properties, 3),
    ]),
    domains: propertyValues(properties, 1),
    registers: propertyValues(properties, 4),
    examples: sense.orneklerListe
      .map((example) => mapExample(example, senseId))
      .filter((example): example is Example => example !== null),
    relations: mapSenseRelations(sense),
  };
}

function mapEntryRelations(entry: TdkEntry): Relation[] {
  const relations: Relation[] = [];

  for (const compound of entry.birlesikKelimeler) {
    const target = mapWordRef(compound.madde, compound.madde_id);
    if (target) {
      relations.push({ type: "compound", target });
    }
  }

  for (const proverb of entry.atasozleri) {
    const target = mapWordRef(proverb.madde, proverb.madde_id);
    if (target) {
      relations.push({ type: "proverb", target });
    }
  }

  return relations;
}

function mapMedia(entry: TdkEntry): MediaAsset[] {
  if (!entry.seskod) {
    return [];
  }

  return [
    {
      type: "audio",
      kind: "pronunciation",
      url: `${TDK_AUDIO_BASE}/${encodeURIComponent(entry.seskod)}.wav`,
    },
  ];
}

export function mapGtsEntry(
  entry: TdkEntry,
  options: MapGtsEntryOptions = {},
): DictionaryEntry {
  const sourceEntryId = String(entry.madde_id);
  const entryId = buildEntryId(TDK_GTS_SOURCE.id, sourceEntryId);

  return {
    id: entryId,
    source: TDK_GTS_SOURCE,
    sourceEntryId,
    headword: entry.madde,
    searchKey: toSearchKey(entry.madde),
    language: entry.lisan ?? null,
    languageCode: entry.lisanKodu ?? null,
    origin: entry.lisanKoken ?? null,
    pronunciation: entry.telaffuz ?? null,
    hyphenation: entry.heceleme ?? null,
    isProperNoun: entry.ozelMi ?? false,
    isPlural: entry.cogulMu ?? false,
    isOblique: entry.egikMi ?? false,
    senses: entry.anlamlarListe.map((sense, index) =>
      mapSense(sense, entryId, index + 1),
    ),
    relations: mapEntryRelations(entry),
    media: mapMedia(entry),
    metadata: {
      sourceUrl: `${TDK_GTS_WEB_BASE}/${encodeURIComponent(entry.madde)}`,
      ...(options.fetchedAt ? { fetchedAt: options.fetchedAt } : {}),
      attribution: TDK_GTS_ATTRIBUTION,
    },
  };
}

export function mapGtsEntries(
  entries: readonly TdkEntry[],
  options: MapGtsEntryOptions = {},
): DictionaryEntry[] {
  return entries.map((entry) => mapGtsEntry(entry, options));
}

export function mapGtsSearchHit(item: TdkSearchResultItem): SearchHit {
  const sourceEntryId = String(item.madde_id);

  return {
    source: TDK_GTS_SOURCE,
    entryId: buildEntryId(TDK_GTS_SOURCE.id, sourceEntryId),
    sourceEntryId,
    headword: item.madde,
    preview: item.preview?.trim() || null,
    partOfSpeech: [...item.wordTypes],
    language: item.lisan_adi ?? null,
    domains: uniqueStrings(item.alanlar.map((alan) => alan.ad)),
    kind: "entry",
  };
}

export function mapGtsSearchResult(result: TdkSearchResult): SourceSearchResult {
  return {
    source: TDK_GTS_SOURCE,
    hits: result.response.sonuclar.map(mapGtsSearchHit),
    total: result.response.toplam,
    nextOffset: result.response.sayfa.sonrakiOffset ?? null,
  };
}
