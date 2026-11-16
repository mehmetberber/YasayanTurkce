import {
  TdkEntryDetailMapSchema,
  TdkEntryListSchema,
  TdkSearchResponseSchema,
  type TdkEntry,
  type TdkSearchResponse,
} from "./schema.js";

const TDK_API_BASE = "https://api.sozluk.gov.tr";
const TDK_WEB_ORIGIN = "https://sozluk.gov.tr";
const REQUEST_TIMEOUT_MS = 30_000;

export const TDK_SEARCH_MODES = [
  "start",
  "end",
  "middle",
  "exact",
  "wildcard",
  "regex",
] as const;

export const TDK_SEARCH_SCOPES = ["madde", "anlam", "ornek", "all"] as const;

export type TdkSearchMode = (typeof TDK_SEARCH_MODES)[number];
export type TdkSearchScope = (typeof TDK_SEARCH_SCOPES)[number];

// TDK'nın kendi web istemcisi gibi görünmeden API 403 dönüyor.
// Bu, API'nin resmî ve stabil olmadığının bir başka göstergesi.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 YasayanTurkce/0.1";

export interface TdkLookupResult {
  query: string;
  requestUrl: string;
  fetchedAt: string;
  entries: TdkEntry[];
  raw: unknown;
}

export interface TdkEntriesResult {
  ids: number[];
  requestUrl: string;
  fetchedAt: string;
  entries: TdkEntry[];
  raw: unknown;
}

export interface TdkSearchOptions {
  mode?: TdkSearchMode;
  scope?: TdkSearchScope;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface ResolvedTdkSearchOptions {
  mode: TdkSearchMode;
  scope: TdkSearchScope;
  sort: string;
  limit: number;
  offset: number;
}

export interface TdkSearchResult {
  query: string;
  options: ResolvedTdkSearchOptions;
  requestUrl: string;
  fetchedAt: string;
  response: TdkSearchResponse;
  raw: unknown;
}

export class TdkApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TdkApiError";
    this.status = status;
  }
}

export class TdkClient {
  async lookup(word: string): Promise<TdkLookupResult> {
    const query = word.trim().toLocaleLowerCase("tr-TR");
    if (!query) {
      throw new Error("Aranacak kelime boş olamaz.");
    }

    const url = new URL("/gts-yeni", TDK_API_BASE);
    url.searchParams.set("ara", query);
    url.searchParams.set("searchType", "web");

    const raw = await this.requestJson(url);
    const entries = TdkEntryListSchema.parse(raw);

    return {
      query,
      requestUrl: url.toString(),
      fetchedAt: new Date().toISOString(),
      entries,
      raw,
    };
  }

  async getEntriesByIds(ids: readonly number[]): Promise<TdkEntriesResult> {
    if (ids.length === 0) {
      throw new Error("En az bir madde id gerekli.");
    }
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new Error("Madde id'leri pozitif tam sayı olmalı.");
    }

    const url = new URL("/gts-yeni/maddeler-detay", TDK_API_BASE);
    const raw = await this.requestJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maddeIds: ids }),
    });
    const entryMap = TdkEntryDetailMapSchema.parse(raw);

    return {
      ids: [...ids],
      requestUrl: url.toString(),
      fetchedAt: new Date().toISOString(),
      entries: Object.values(entryMap),
      raw,
    };
  }

  async search(query: string, options: TdkSearchOptions = {}): Promise<TdkSearchResult> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new Error("Aranacak kelime boş olamaz.");
    }

    const resolved: ResolvedTdkSearchOptions = {
      mode: options.mode ?? "start",
      scope: options.scope ?? "madde",
      sort: options.sort ?? "madde_asc",
      limit: options.limit ?? 25,
      offset: options.offset ?? 0,
    };

    if (!TDK_SEARCH_MODES.includes(resolved.mode)) {
      throw new Error(
        `Geçersiz mode: ${resolved.mode}. Geçerli değerler: ${TDK_SEARCH_MODES.join(", ")}`,
      );
    }
    if (!TDK_SEARCH_SCOPES.includes(resolved.scope)) {
      throw new Error(
        `Geçersiz scope: ${resolved.scope}. Geçerli değerler: ${TDK_SEARCH_SCOPES.join(", ")}`,
      );
    }
    if (!Number.isInteger(resolved.limit) || resolved.limit < 1 || resolved.limit > 100) {
      throw new Error("limit 1 ile 100 arasında bir tam sayı olmalı.");
    }
    if (!Number.isInteger(resolved.offset) || resolved.offset < 0) {
      throw new Error("offset 0 veya daha büyük bir tam sayı olmalı.");
    }

    const url = new URL("/gts-yeni/arama", TDK_API_BASE);
    url.searchParams.set("q", normalizedQuery);
    url.searchParams.set("mode", resolved.mode);
    url.searchParams.set("scope", resolved.scope);
    url.searchParams.set("sort", resolved.sort);
    url.searchParams.set("limit", String(resolved.limit));
    url.searchParams.set("offset", String(resolved.offset));
    url.searchParams.set("searchType", "web");

    const raw = await this.requestJson(url);
    const response = TdkSearchResponseSchema.parse(raw);

    return {
      query: normalizedQuery,
      options: resolved,
      requestUrl: url.toString(),
      fetchedAt: new Date().toISOString(),
      response,
      raw,
    };
  }

  private async requestJson(url: URL, init: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set("User-Agent", USER_AGENT);
    headers.set("Accept", "application/json, text/plain, */*");
    headers.set("Origin", TDK_WEB_ORIGIN);
    headers.set("Referer", `${TDK_WEB_ORIGIN}/`);

    const response = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new TdkApiError(
        `TDK API ${response.status} döndü.${body ? ` Cevap: ${body.slice(0, 200)}` : ""}`,
        response.status,
      );
    }

    return response.json();
  }
}
