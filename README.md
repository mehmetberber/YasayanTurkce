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

> Not: TDK verisi geliştirme/prototip aşamasında referans olarak kullanılmaktadır. Üretimde kullanım ve yeniden dağıtım için TDK'nın telif ve kullanım koşulları ayrıca değerlendirilmelidir.
