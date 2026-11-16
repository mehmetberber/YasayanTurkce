import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import {
  TdkApiError,
  TdkClient,
  TDK_SEARCH_MODES,
  TDK_SEARCH_SCOPES,
  type TdkSearchMode,
  type TdkSearchResult,
  type TdkSearchScope,
} from "@yasayan-turkce/tdk";
import { slugify, truncate } from "./text.js";

function usage(): void {
  console.log("Kullanım: pnpm tdk:search <kelime> [seçenekler]");
  console.log("");
  console.log("Seçenekler:");
  console.log(
    `  --mode <mod>      ${TDK_SEARCH_MODES.join(" | ")} (varsayılan: start)`,
  );
  console.log(
    `  --scope <kapsam>  ${TDK_SEARCH_SCOPES.join(" | ")} (varsayılan: madde)`,
  );
  console.log("  --sort <sıra>     Sıralama (varsayılan: madde_asc)");
  console.log("  --limit <sayı>    1-100 (varsayılan: 25)");
  console.log("  --offset <sayı>   Sayfa başlangıcı (varsayılan: 0)");
  console.log("");
  console.log("Örnekler:");
  console.log('  pnpm tdk:search "kitap"');
  console.log('  pnpm tdk:search "kitap" --mode middle --scope anlam --limit 5');
  console.log('  pnpm tdk:search "kitap" --mode exact --scope all --limit 10');
}

function isSearchMode(value: string): value is TdkSearchMode {
  return (TDK_SEARCH_MODES as readonly string[]).includes(value);
}

function isSearchScope(value: string): value is TdkSearchScope {
  return (TDK_SEARCH_SCOPES as readonly string[]).includes(value);
}

function parseIntOption(name: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} bir tam sayı olmalı: ${value}`);
  }
  return parsed;
}

async function saveRaw(result: TdkSearchResult): Promise<string> {
  const directory = path.resolve(process.cwd(), "data", "raw", "tdk", "search");
  await mkdir(directory, { recursive: true });

  const { mode, scope, limit, offset } = result.options;
  const fileName = `${slugify(result.query)}-${mode}-${scope}-${limit}-${offset}.json`;
  const filePath = path.join(directory, fileName);
  const payload = {
    source: result.requestUrl,
    fetchedAt: result.fetchedAt,
    query: result.query,
    options: result.options,
    data: result.raw,
  };

  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

function printResults(result: TdkSearchResult): void {
  const { response, options } = result;
  const pageStart = options.offset + 1;
  const pageEnd = options.offset + response.sonuclar.length;
  const pageInfo = response.sonuclar.length > 0 ? `${pageStart}-${pageEnd}` : "0";

  console.log(
    `\n"${result.query}" | mod: ${options.mode} | kapsam: ${options.scope} | ` +
      `toplam: ${response.toplam} | sayfa: ${pageInfo}`,
  );

  if (response.sonuclar.length === 0) {
    console.log("Sonuç bulunamadı.");
    return;
  }

  response.sonuclar.forEach((item, index) => {
    const types = item.wordTypes.length > 0 ? ` [${item.wordTypes.join(", ")}]` : "";
    const language = item.lisan_adi ? ` (${item.lisan_adi})` : "";
    const domains = item.alanlar
      .map((alan) => alan.ad)
      .filter((ad): ad is string => Boolean(ad));
    const domainText = domains.length > 0 ? ` {${domains.join(", ")}}` : "";

    console.log(
      `  ${options.offset + index + 1}. ${item.madde}${types}${language}${domainText}`,
    );

    if (item.preview) {
      console.log(`     ${truncate(item.preview, 160)}`);
    }
  });

  if (response.sayfa.sonrakiOffset !== null && response.sayfa.sonrakiOffset !== undefined) {
    console.log(`  … sonraki sayfa için --offset ${response.sayfa.sonrakiOffset}`);
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      mode: { type: "string", default: "start" },
      scope: { type: "string", default: "madde" },
      sort: { type: "string", default: "madde_asc" },
      limit: { type: "string", default: "25" },
      offset: { type: "string", default: "0" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help || positionals.length === 0) {
    usage();
    return;
  }

  const query = positionals.join(" ").trim();
  if (!query) {
    usage();
    process.exitCode = 1;
    return;
  }

  const mode = String(values.mode);
  const scope = String(values.scope);

  if (!isSearchMode(mode)) {
    throw new Error(`Geçersiz mode: ${mode}. Geçerli değerler: ${TDK_SEARCH_MODES.join(", ")}`);
  }

  if (!isSearchScope(scope)) {
    throw new Error(`Geçersiz scope: ${scope}. Geçerli değerler: ${TDK_SEARCH_SCOPES.join(", ")}`);
  }

  const client = new TdkClient();
  console.log(`TDK'da aranıyor: ${query}`);

  const result = await client.search(query, {
    mode,
    scope,
    sort: String(values.sort),
    limit: parseIntOption("limit", String(values.limit)),
    offset: parseIntOption("offset", String(values.offset)),
  });

  printResults(result);

  const filePath = await saveRaw(result);
  console.log(`\nHam cevap kaydedildi: ${path.relative(process.cwd(), filePath)}`);
}

main().catch((error: unknown) => {
  if (error instanceof TdkApiError) {
    console.error(`TDK API hatası: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`Hata: ${error.message}`);
  } else {
    console.error("Bilinmeyen hata:", error);
  }

  process.exitCode = 1;
});
