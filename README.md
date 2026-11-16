# YasayanTurkce
Yaşayan Türkçe Sözlük

## Geliştirme

Gereksinimler:

- Node.js 22+
- pnpm (Corepack ile)

Kurulum:

```bash
pnpm install
```

TDK probe aracını çalıştırma:

```bash
pnpm tdk:probe kitap
```

Bu komut TDK'nın web arayüzünün kullandığı JSON uç noktasına istek atar, cevabı Zod ile doğrular ve ham cevabı `tools/tdk-probe/data/raw/tdk/` altına kaydeder.

TDK arama probe'u:

```bash
pnpm tdk:search "kitap"
pnpm tdk:search "kitap" --mode middle --scope anlam --limit 5
pnpm tdk:search "kitap" --mode exact --scope all --limit 10
```

Testler:

```bash
pnpm test
pnpm typecheck
```

## Paketler

- `packages/domain` — kaynaktan bağımsız domain modeli ve arama arayüzleri
- `packages/tdk` — TDK istemcisi, ham şemalar, GTS mapper'ı ve `GtsSource`
- `tools/tdk-probe` — TDK API'sini incelemek için CLI araçları

> Not: TDK verisi geliştirme/prototip aşamasında referans olarak kullanılmaktadır. Üretimde kullanım ve yeniden dağıtım için TDK'nın telif ve kullanım koşulları ayrıca değerlendirilmelidir.
