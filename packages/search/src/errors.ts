export class UnknownDictionarySourceError extends Error {
  readonly sourceId: string;

  constructor(sourceId: string) {
    super(`Bilinmeyen sözlük kaynağı: ${sourceId}`);
    this.name = "UnknownDictionarySourceError";
    this.sourceId = sourceId;
  }
}

export class SourceNotSearchableError extends Error {
  readonly sourceId: string;

  constructor(sourceId: string) {
    super(`Sözlük kaynağı aramayı desteklemiyor: ${sourceId}`);
    this.name = "SourceNotSearchableError";
    this.sourceId = sourceId;
  }
}
