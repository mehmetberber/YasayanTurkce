import type {
  DictionaryEntry,
  DictionarySource,
  DictionarySourceDefinition,
  EntryRef,
  SearchOptions,
  SourceSearchResult,
} from "@yasayan-turkce/domain";

import {
  TDK_SEARCH_MODES,
  TDK_SEARCH_SCOPES,
  TdkClient,
  type TdkSearchMode,
  type TdkSearchScope,
} from "../client.js";
import {
  mapGtsEntry,
  mapGtsSearchResult,
  TDK_GTS_SOURCE,
} from "./mapper.js";

export const TDK_GTS_DEFINITION: DictionarySourceDefinition = {
  source: TDK_GTS_SOURCE,
  capabilities: {
    search: true,
    detail: true,
    pagination: true,
    modes: TDK_SEARCH_MODES,
    scopes: TDK_SEARCH_SCOPES,
  },
};

export class GtsSource implements DictionarySource {
  readonly definition = TDK_GTS_DEFINITION;

  constructor(private readonly client: TdkClient = new TdkClient()) {}

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SourceSearchResult> {
    const result = await this.client.search(query, {
      mode: options.mode as TdkSearchMode | undefined,
      scope: options.scope as TdkSearchScope | undefined,
      limit: options.limit,
      offset: options.offset,
    });

    return mapGtsSearchResult(result);
  }

  async getEntry(ref: EntryRef): Promise<DictionaryEntry | null> {
    if (ref.sourceId !== TDK_GTS_SOURCE.id) {
      throw new Error(
        `GtsSource yalnızca ${TDK_GTS_SOURCE.id} kaynağını destekler.`,
      );
    }

    const result = await this.client.lookup(ref.headword);
    const entry =
      ref.sourceEntryId != null
        ? result.entries.find(
            (item) => String(item.madde_id) === ref.sourceEntryId,
          )
        : result.entries[0];

    return entry
      ? mapGtsEntry(entry, { fetchedAt: result.fetchedAt })
      : null;
  }
}
