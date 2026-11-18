export interface SnapshotReader {
  open(
    manufacturer: string,
    layoutId: number,
  ): Promise<{
    release?(): Promise<void>;
    all<T>(sql: string, params: readonly (string | number | null)[]): Promise<T[]>;
  }>;
}
