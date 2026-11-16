import type {
  DictionaryEntry,
  EntryRef,
  SourceRef,
  SourceSearchResult,
} from "./models.js";

export interface SourceCapabilities {
  readonly search: boolean;
  readonly detail: boolean;
  readonly pagination: boolean;
  readonly modes?: readonly string[];
  readonly scopes?: readonly string[];
}

export interface DictionarySourceDefinition {
  readonly source: SourceRef;
  readonly capabilities: SourceCapabilities;
}

export interface SearchOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly mode?: string;
  readonly scope?: string;
}

export interface DictionarySource {
  readonly definition: DictionarySourceDefinition;

  search(query: string, options?: SearchOptions): Promise<SourceSearchResult>;

  getEntry?(ref: EntryRef): Promise<DictionaryEntry | null>;
}
