import { DictionarySourceRegistry } from "@yasayan-turkce/search";
import { AdsSource, GtsSource, TdkClient } from "@yasayan-turkce/tdk";

export function createSourceRegistry(
  tdkTimeoutMs?: number,
): DictionarySourceRegistry {
  const client = new TdkClient(tdkTimeoutMs);

  return new DictionarySourceRegistry()
    .register(new GtsSource(client))
    .register(new AdsSource(client));
}
