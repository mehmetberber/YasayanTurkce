import type {
  DictionarySource,
  DictionarySourceDefinition,
  SearchOptions,
  SourceSearchResult,
} from "@yasayan-turkce/domain";

import { TdkClient } from "../client.js";
import { mapAdsSearchResult, TDK_ADS_SOURCE } from "./mapper.js";

export const TDK_ADS_DEFINITION: DictionarySourceDefinition = {
  source: TDK_ADS_SOURCE,
  capabilities: {
    search: true,
    detail: false,
    pagination: false,
  },
};

export class AdsSource implements DictionarySource {
  readonly definition = TDK_ADS_DEFINITION;

  constructor(private readonly client: TdkClient = new TdkClient()) {}

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SourceSearchResult> {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 25;

    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error("offset 0 veya daha büyük bir tam sayı olmalı.");
    }
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("limit 1 veya daha büyük bir tam sayı olmalı.");
    }

    const result = await this.client.searchAds(query);
    const mapped = mapAdsSearchResult(result);
    const hits = mapped.hits.slice(offset, offset + limit);
    const nextOffset =
      offset + hits.length < mapped.hits.length ? offset + hits.length : null;

    return {
      ...mapped,
      hits,
      nextOffset,
    };
  }
}
