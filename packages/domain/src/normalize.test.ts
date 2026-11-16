import { describe, expect, it } from "vitest";

import { buildEntryId, normalizeTurkish, toSearchKey } from "./normalize.js";

describe("normalizeTurkish", () => {
  it("Türkçe büyük/küçük harf kurallarını uygular", () => {
    expect(normalizeTurkish("İSTANBUL")).toBe("istanbul");
    expect(normalizeTurkish("IŞIK")).toBe("ışık");
    expect(normalizeTurkish("  Kitap  ")).toBe("kitap");
  });

  it("düzeltme işaretlerini sadeleştirir", () => {
    expect(normalizeTurkish("KÂĞIT")).toBe("kağıt");
    expect(normalizeTurkish("KÎMYA")).toBe("kimya");
    expect(normalizeTurkish("SÜKÛT")).toBe("sükut");
  });
});

describe("toSearchKey", () => {
  it("fazla boşlukları ve noktalama işaretlerini temizler", () => {
    expect(toSearchKey("  Kitap   Açacağı ")).toBe("kitap açacağı");
    expect(toSearchKey("kitap, açacağı!")).toBe("kitap açacağı");
  });
});

describe("buildEntryId", () => {
  it("kaynak ve madde id'sini birleştirir", () => {
    expect(buildEntryId("tdk-gts", 27874)).toBe("tdk-gts:27874");
  });
});
