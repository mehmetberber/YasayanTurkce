import {
  buildEntryId,
  type SearchHit,
  type SourceRef,
  type SourceSearchResult,
} from "@yasayan-turkce/domain";

import type { TdkAdsResult } from "../client.js";
import type { TdkAdsEntry } from "../schema.js";

export const TDK_ADS_SOURCE: SourceRef = {
  id: "tdk-ads",
  name: "Atasözleri ve Deyimler Sözlüğü",
  provider: "tdk",
  kind: "proverb",
};

export function mapAdsHit(entry: TdkAdsEntry): SearchHit | null {
  const headword = entry.sozum?.trim();
  if (!headword) {
    return null;
  }

  const sourceEntryId = String(entry.soz_id);
  const kind = entry.turu2?.toLocaleLowerCase("tr-TR").includes("deyim")
    ? "idiom"
    : "proverb";

  return {
    source: TDK_ADS_SOURCE,
    entryId: buildEntryId(TDK_ADS_SOURCE.id, sourceEntryId),
    sourceEntryId,
    headword,
    preview: entry.anlami?.trim() || null,
    partOfSpeech: [],
    language: null,
    domains: [],
    kind,
  };
}

export function mapAdsSearchResult(result: TdkAdsResult): SourceSearchResult {
  const hits = result.entries
    .map(mapAdsHit)
    .filter((hit): hit is SearchHit => hit !== null);

  return {
    source: TDK_ADS_SOURCE,
    hits,
    total: hits.length,
    nextOffset: null,
  };
}
