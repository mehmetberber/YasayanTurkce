import type { DictionarySource } from "@yasayan-turkce/domain";

export class DictionarySourceRegistry {
  private readonly sources = new Map<string, DictionarySource>();

  register(source: DictionarySource): this {
    const sourceId = source.definition.source.id;
    if (this.sources.has(sourceId)) {
      throw new Error(`Kaynak zaten kayıtlı: ${sourceId}`);
    }

    this.sources.set(sourceId, source);
    return this;
  }

  get(sourceId: string): DictionarySource | undefined {
    return this.sources.get(sourceId);
  }

  has(sourceId: string): boolean {
    return this.sources.has(sourceId);
  }

  list(): DictionarySource[] {
    return [...this.sources.values()];
  }
}
