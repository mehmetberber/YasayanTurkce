import { parseArgs } from "node:util";

import type { SearchResult } from "@yasayan-turkce/domain";
import {
  DictionarySourceRegistry,
  SearchService,
  UnknownDictionarySourceError,
} from "@yasayan-turkce/search";
import { AdsSource, GtsSource } from "@yasayan-turkce/tdk";

import { truncate } from "./text.js";

const KIND_LABELS: Record<string, string> = {
  entry: "madde",
  proverb: "atasözü",
  idiom: "deyim",
  dialect: "ağız",
  etymology: "etimoloji",
  name: "kişi adı",
  historical: "tarihî",
};

function usage(): void {
  console.log("Kullanım: pnpm tdk:multi-search <kelime> [seçenekler]");
  console.log("");
  console.log("Kaynaklar: tdk-gts, tdk-ads");
  console.log("");
  console.log("Seçenekler:");
  console.log("  --source <id>     Kaynak seç (birden fazla kez kullanılabilir)");
  console.log("  --limit <sayı>    Kaynak başına sonuç sayısı (varsayılan: 5)");
  console.log("  --offset <sayı>   Sayfa başlangıcı (varsayılan: 0)");
  console.log("  --mode <mod>      GTS arama modu (varsayılan: start)");
  console.log("  --scope <kapsam>  GTS arama kapsamı (varsayılan: madde)");
  console.log("  --timeout <ms>    Kaynak başına zaman aşımı (varsayılan: 45000)");
  console.log("");
  console.log("Örnekler:");
  console.log('  pnpm tdk:multi-search "acemi"');
  console.log('  pnpm tdk:multi-search "kitap" --source tdk-gts --limit 3');
  console.log('  pnpm tdk:multi-search "acemi" --source tdk-ads --limit 10');
}

function createRegistry(): DictionarySourceRegistry {
  return new DictionarySourceRegistry()
    .register(new GtsSource())
    .register(new AdsSource());
}

function parseIntOption(name: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} bir tam sayı olmalı: ${value}`);
  }
  return parsed;
}

function printResult(result: SearchResult): void {
  console.log(
    `\n"${result.query}" | ${result.groups.length} kaynak | toplam eşleşme: ${result.total}`,
  );

  for (const group of result.groups) {
    console.log(
      `\n[${group.source.name}] ${group.hits.length}/${group.total} sonuç`,
    );

    group.hits.forEach((hit, index) => {
      const labels = [
        KIND_LABELS[hit.kind] ?? hit.kind,
        ...hit.partOfSpeech,
        hit.language,
      ].filter((value): value is string => Boolean(value));
      const suffix = labels.length > 0 ? ` (${labels.join(" · ")})` : "";

      console.log(`  ${index + 1}. ${hit.headword}${suffix}`);

      if (hit.preview) {
        console.log(`     ${truncate(hit.preview, 160)}`);
      }
    });

    if (group.nextOffset !== null && group.nextOffset !== undefined) {
      console.log(`  … sonraki sayfa için --offset ${group.nextOffset}`);
    }
  }

  if (result.failures.length > 0) {
    console.log("\nHatalar:");
    for (const failure of result.failures) {
      console.log(`  - ${failure.source.name}: ${failure.message}`);
    }
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      source: { type: "string", multiple: true, default: [] },
      limit: { type: "string", default: "5" },
      offset: { type: "string", default: "0" },
      mode: { type: "string" },
      scope: { type: "string" },
      timeout: { type: "string", default: "45000" },
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

  const registry = createRegistry();
  const sourceIds =
    values.source.length > 0 ? values.source : undefined;
  const service = new SearchService(registry);

  try {
    const result = await service.search(query, {
      sourceIds,
      limit: parseIntOption("limit", String(values.limit)),
      offset: parseIntOption("offset", String(values.offset)),
      mode: values.mode,
      scope: values.scope,
      timeoutMs: parseIntOption("timeout", String(values.timeout)),
    });

    printResult(result);
  } catch (error) {
    if (error instanceof UnknownDictionarySourceError) {
      const validSources = registry
        .list()
        .map((source) => source.definition.source.id)
        .join(", ");
      throw new Error(
        `Bilinmeyen kaynak: ${error.sourceId}. Geçerli kaynaklar: ${validSources}`,
      );
    }

    throw error;
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(`Hata: ${error.message}`);
  } else {
    console.error("Bilinmeyen hata:", error);
  }

  process.exitCode = 1;
});
