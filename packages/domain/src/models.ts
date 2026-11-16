export type SourceProvider = "tdk" | "wiktionary" | "community";

export type SourceKind =
  | "dictionary"
  | "proverb"
  | "dialect"
  | "etymology"
  | "name"
  | "historical"
  | "thesaurus";

export interface SourceRef {
  readonly id: string;
  readonly name: string;
  readonly provider: SourceProvider;
  readonly kind: SourceKind;
}

export interface WordRef {
  readonly headword: string;
  readonly sourceId: string;
  readonly sourceEntryId?: string;
}

export interface EntryRef {
  readonly sourceId: string;
  readonly sourceEntryId?: string;
  readonly headword: string;
}

export type RelationType =
  | "synonym"
  | "antonym"
  | "reference"
  | "compound"
  | "proverb"
  | "idiom";

export interface Relation {
  readonly type: RelationType;
  readonly target: WordRef;
}

export interface PersonRef {
  readonly id?: string;
  readonly fullName: string;
  readonly shortName?: string;
}

export interface Example {
  readonly id: string;
  readonly text: string;
  readonly authors: readonly PersonRef[];
}

export interface Sense {
  readonly id: string;
  readonly sourceSenseId: string;
  readonly order: number;
  readonly definition: string | null;
  readonly partOfSpeech: readonly string[];
  readonly domains: readonly string[];
  readonly registers: readonly string[];
  readonly examples: readonly Example[];
  readonly relations: readonly Relation[];
}

export type MediaType = "audio" | "image" | "video";
export type MediaKind = "pronunciation" | "illustration" | "signLanguage" | "other";

export interface MediaAsset {
  readonly type: MediaType;
  readonly kind: MediaKind;
  readonly url: string;
}

export interface EntryMetadata {
  readonly sourceUrl?: string;
  readonly fetchedAt?: string;
  readonly attribution: string;
}

export interface DictionaryEntry {
  readonly id: string;
  readonly source: SourceRef;
  readonly sourceEntryId: string;
  readonly headword: string;
  readonly searchKey: string;
  readonly language: string | null;
  readonly languageCode: number | null;
  readonly origin: string | null;
  readonly pronunciation: string | null;
  readonly hyphenation: string | null;
  readonly isProperNoun: boolean;
  readonly isPlural: boolean;
  readonly isOblique: boolean;
  readonly senses: readonly Sense[];
  readonly relations: readonly Relation[];
  readonly media: readonly MediaAsset[];
  readonly metadata: EntryMetadata;
}

export type SearchHitKind =
  | "entry"
  | "proverb"
  | "idiom"
  | "dialect"
  | "etymology"
  | "name"
  | "historical";

export interface SearchHit {
  readonly source: SourceRef;
  readonly entryId?: string;
  readonly sourceEntryId: string;
  readonly headword: string;
  readonly preview: string | null;
  readonly partOfSpeech: readonly string[];
  readonly language: string | null;
  readonly domains: readonly string[];
  readonly kind: SearchHitKind;
}

export interface SourceSearchResult {
  readonly source: SourceRef;
  readonly hits: readonly SearchHit[];
  readonly total: number;
  readonly nextOffset?: number | null;
}

export interface SearchSourceFailure {
  readonly source: SourceRef;
  readonly message: string;
}

export interface SearchResult {
  readonly query: string;
  readonly groups: readonly SourceSearchResult[];
  readonly failures: readonly SearchSourceFailure[];
  readonly total: number;
}
