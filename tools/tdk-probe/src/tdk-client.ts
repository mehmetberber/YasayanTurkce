import { TdkEntryListSchema, type TdkEntry } from "./schema.js";

const TDK_API_BASE = "https://api.sozluk.gov.tr";
const TDK_WEB_ORIGIN = "https://sozluk.gov.tr";
const REQUEST_TIMEOUT_MS = 30_000;

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

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json, text/plain, */*",
        Origin: TDK_WEB_ORIGIN,
        Referer: `${TDK_WEB_ORIGIN}/`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new TdkApiError(
        `TDK API ${response.status} döndü.${body ? ` Cevap: ${body.slice(0, 200)}` : ""}`,
        response.status,
      );
    }

    const raw: unknown = await response.json();
    const entries = TdkEntryListSchema.parse(raw);

    return {
      query,
      requestUrl: url.toString(),
      fetchedAt: new Date().toISOString(),
      entries,
      raw,
    };
  }
}
