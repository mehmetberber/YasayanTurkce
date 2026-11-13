import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { TdkApiError, TdkClient, type TdkLookupResult } from "./tdk-client.js";
import type { TdkEntry } from "./schema.js";
import { slugify, truncate } from "./text.js";

function usage(): void {
  console.log("Kullanım: pnpm tdk:probe <kelime>");
  console.log("Örnek:    pnpm tdk:probe kitap");
}

function printEntry(entry: TdkEntry): void {
  const exampleCount = entry.anlamlarListe.reduce(
    (total, sense) => total + sense.orneklerListe.length,
    0,
  );

  console.log(`\n${entry.madde}  (madde_id: ${entry.madde_id})`);
  console.log(
    `  Köken: ${entry.lisan ?? "-"}${entry.lisanKoken ? ` (${entry.lisanKoken})` : ""}`,
  );
  console.log(
    `  Anlam: ${entry.anlamlarListe.length} | Örnek: ${exampleCount} | ` +
      `Birleşik: ${entry.birlesikKelimeler.length} | Atasözü/deyim: ${entry.atasozleri.length}`,
  );

  if (entry.seskod) {
    console.log(
      `  Ses: https://api.sozluk.gov.tr/ses/${encodeURIComponent(entry.seskod)}.wav`,
    );
  }

  entry.anlamlarListe.slice(0, 3).forEach((sense, index) => {
    const definition = sense.anlam?.trim() || "(tanım yok)";
    console.log(`  ${index + 1}. ${truncate(definition)}`);
  });

  if (entry.anlamlarListe.length > 3) {
    console.log(`  … ${entry.anlamlarListe.length - 3} anlam daha`);
  }
}

async function saveRaw(result: TdkLookupResult): Promise<string> {
  const directory = path.resolve(process.cwd(), "data", "raw", "tdk");
  await mkdir(directory, { recursive: true });

  const filePath = path.join(directory, `${slugify(result.query)}.json`);
  const payload = {
    source: result.requestUrl,
    fetchedAt: result.fetchedAt,
    query: result.query,
    data: result.raw,
  };

  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const word = args.join(" ").trim();
  if (!word) {
    usage();
    process.exitCode = 1;
    return;
  }

  const client = new TdkClient();
  console.log(`TDK'da aranıyor: ${word}`);

  const result = await client.lookup(word);

  if (result.entries.length === 0) {
    console.log(`"${word}" için TDK'da madde bulunamadı.`);
  } else {
    result.entries.forEach(printEntry);
  }

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
