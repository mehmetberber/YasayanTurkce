import { z } from "zod";

export const TdkAuthorSchema = z.object({
  yazar_id: z.number(),
  tam_adi: z.string().nullish(),
  kisa_adi: z.string().nullish(),
});

export const TdkExampleSchema = z.object({
  ornek_id: z.number(),
  ornek: z.string().nullish(),
  yazar: z.array(TdkAuthorSchema).default([]),
});

export const TdkPropertySchema = z.object({
  ozellik_id: z.number(),
  tam_adi: z.string().nullish(),
  kisa_adi: z.string().nullish(),
  tur: z.number(),
});

export const TdkSenseSchema = z.object({
  anlam_id: z.number(),
  anlam: z.string().nullish(),
  orneklerListe: z.array(TdkExampleSchema).default([]),
  ozelliklerListe: z.array(TdkPropertySchema).default([]),
  sozcukTuru: z.string().nullish(),
  anlamEsAnlam: z.array(z.unknown()).default([]),
  anlamKarsitAnlam: z.array(z.unknown()).default([]),
  anlamReferans: z.array(z.unknown()).default([]),
});

export const TdkReferenceSchema = z.object({
  madde_id: z.number(),
  madde: z.string().nullish(),
});

export const TdkEntrySchema = z.object({
  madde: z.string(),
  madde_id: z.number(),
  kac: z.number().default(0),
  lisan: z.string().nullish(),
  lisanKoken: z.string().nullish(),
  lisanKodu: z.number().nullish(),
  telaffuz: z.string().nullish(),
  heceleme: z.string().nullish(),
  fonemik: z.string().nullish(),
  taki: z.string().nullish(),
  cogulMu: z.boolean().optional(),
  ozelMi: z.boolean().optional(),
  egikMi: z.boolean().optional(),
  seskod: z.string().nullish(),
  anlamlarListe: z.array(TdkSenseSchema).default([]),
  anlamGruplari: z.array(z.unknown()).default([]),
  birlesikKelimeler: z.array(TdkReferenceSchema).default([]),
  atasozleri: z.array(TdkReferenceSchema).default([]),
});

export const TdkEntryListSchema = z.array(TdkEntrySchema);

export type TdkAuthor = z.infer<typeof TdkAuthorSchema>;
export type TdkExample = z.infer<typeof TdkExampleSchema>;
export type TdkProperty = z.infer<typeof TdkPropertySchema>;
export type TdkSense = z.infer<typeof TdkSenseSchema>;
export type TdkReference = z.infer<typeof TdkReferenceSchema>;
export type TdkEntry = z.infer<typeof TdkEntrySchema>;
