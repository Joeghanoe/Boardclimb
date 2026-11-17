import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { openDatabaseAsync } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { fetch } from 'expo/fetch';
import { Gunzip } from 'fflate';
import { CatalogError } from '@boardclimb/catalog-core';
import { parseSnapshotArtifact } from '@boardclimb/provider-snapshots';
import { SNAPSHOT_BROWSE_INDEX } from '@boardclimb/provider-snapshots';
import type { SnapshotReader } from '@boardclimb/provider-snapshots';

/** Download complete public datasets to a separate directory; log/cache tables are never replaced. */
export class DeviceSnapshotReader implements SnapshotReader {
  private readonly directory = new Directory(Paths.document, 'catalog-snapshots');
  private readonly connections = new Map<string, SQLiteDatabase>();
  private readonly pending = new Map<string, Promise<SQLiteDatabase>>();
  constructor(private readonly now: () => number = Date.now) {}

  private readonly opening = new Map<string, Promise<SQLiteDatabase>>();
  private readonly closing = new Set<SQLiteDatabase>();
  private readonly leases = new Map<SQLiteDatabase, number>();
  private readonly filenames = new Map<SQLiteDatabase, string>();
  private readonly retired = new Map<SQLiteDatabase, string>();
  private readonly checked = new Map<string, number>();

  async open(manufacturer: string, layout: number): ReturnType<SnapshotReader['open']> {
    const key = `${manufacturer}-${layout}`;
    let opening = this.opening.get(key);
    if (!opening) {
      opening = this.openDatabase(manufacturer, layout).finally(() => this.opening.delete(key));
      this.opening.set(key, opening);
    }
    const db = await opening;
    this.leases.set(db, (this.leases.get(db) ?? 0) + 1);
    let released = false;
    return {
      release: async () => {
        if (released) return;
        released = true;
        this.leases.set(db, (this.leases.get(db) ?? 1) - 1);
        await this.closeRetired(db);
      },
      all: <T>(sql: string, params: readonly (string | number | null)[]) =>
        db.getAllAsync<T>(sql, [...params]),
    };
  }

  private async openDatabase(manufacturer: string, layout: number): Promise<SQLiteDatabase> {
    if (
      !['kilter', 'moonboard', 'tension'].includes(manufacturer) ||
      !Number.isSafeInteger(layout) ||
      layout < 1
    )
      throw new CatalogError('not_found', 'Unknown catalog.');
    const key = `${manufacturer}-${layout}`;
    this.directory.create({ intermediates: true, idempotent: true });
    let cached = this.connections.get(key);
    // A completion marker is published only after validation; interrupted installs cannot hide an older good file.
    if (!cached) {
      const candidates = this.directory
        .list()
        .filter((file) => new RegExp(`^${key}-[0-9]+\\.db$`).test(file.name))
        .sort((a, b) => b.name.localeCompare(a.name));
      for (const file of candidates) {
        const marker = new File(this.directory, `${file.name}.complete`);
        if (!marker.exists || (await marker.text()) !== file.name) continue;
        try {
          cached = await openDatabaseAsync(file.name, { useNewConnection: true }, this.directory.uri);
          await cached.getAllAsync('SELECT uuid FROM board_climbs LIMIT 1');
          // Files downloaded before browsing used it get the index on first open (once, a second or two).
          await cached.execAsync(SNAPSHOT_BROWSE_INDEX).catch(() => undefined);
          this.connections.set(key, cached);
          this.filenames.set(cached, file.name);
          break;
        } catch {
          await cached?.closeAsync().catch(() => undefined);
          cached = undefined;
        }
      }
    }
    const recent = (this.checked.get(key) ?? 0) > this.now() - 24 * 60 * 60 * 1000;
    if (cached) {
      if (!recent) void this.refresh(manufacturer, layout, key).catch(() => undefined);
      return cached;
    }
    return this.refresh(manufacturer, layout, key);
  }

  private refresh(manufacturer: string, layout: number, key: string): Promise<SQLiteDatabase> {
    const active = this.pending.get(key);
    if (active) return active;
    this.checked.set(key, this.now());
    const work = this.download(manufacturer, layout, key).finally(() => this.pending.delete(key));
    this.pending.set(key, work);
    return work;
  }

  private async download(manufacturer: string, layout: number, key: string): Promise<SQLiteDatabase> {
    const downloaded = new File(this.directory, `${key}.download`);
    const staged = new File(this.directory, `${key}.staged`);
    let db: SQLiteDatabase | undefined;
    try {
      const response = await fetch('https://snapshots.boardsesh.com/board-snapshots/v1-gzip/manifest.json', {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Manifest unavailable');
      const artifact = parseSnapshotArtifact(await response.json(), manufacturer, layout);
      const filename = `${key}-${Date.parse(artifact.builtAt)}.db`;
      const installed = new File(this.directory, filename);
      if (
        installed.exists &&
        new File(this.directory, `${filename}.complete`).exists &&
        (await new File(this.directory, `${filename}.complete`).text()) === filename
      ) {
        db = await openDatabaseAsync(filename, { useNewConnection: true }, this.directory.uri);
        await this.publish(key, db, filename);
        return db;
      }
      if (Paths.availableDiskSpace < artifact.bytes + artifact.uncompressedBytes + 32 * 1024 * 1024)
        throw new Error('Not enough space');
      await File.downloadFileAsync(artifact.url, downloaded, { idempotent: true });
      const input = downloaded.open(FileMode.ReadOnly);
      try {
        const magic = await input.readBytes(16);
        input.offset = 0;
        if (magic[0] === 31 && magic[1] === 139) {
          if (downloaded.size !== artifact.bytes) throw new Error('Truncated gzip');
          staged.create({ overwrite: true });
          const output = staged.open(FileMode.ReadWrite);
          let written = 0;
          try {
            const decoder = new Gunzip((chunk) => {
              written += chunk.length;
              if (written > artifact.uncompressedBytes) throw new Error('Oversized catalog');
              output.writeBytesSync(chunk);
            });
            while ((input.offset ?? 0) < (input.size ?? 0)) {
              const chunk = await input.readBytes(65536);
              decoder.push(chunk, (input.offset ?? 0) === input.size);
            }
          } finally {
            output.close();
          }
        } else {
          if (String.fromCharCode(...magic.slice(0, 15)) !== 'SQLite format 3')
            throw new Error('Invalid catalog file');
          await downloaded.copy(staged);
        }
      } finally {
        input.close();
      }
      if (staged.size !== artifact.uncompressedBytes) throw new Error('Truncated catalog');
      db = await openDatabaseAsync(staged.name, { useNewConnection: true }, this.directory.uri);
      const check = await db.getFirstAsync<{ quick_check: string }>('PRAGMA quick_check');
      if (check?.quick_check !== 'ok') throw new Error('Invalid SQLite');
      await db.getAllAsync('SELECT uuid,frames,compatible_size_ids,is_hidden FROM board_climbs LIMIT 1');
      await db.getAllAsync(
        'SELECT climb_uuid,angle,display_difficulty,quality_average FROM board_climb_stats LIMIT 1',
      );
      await db.execAsync(SNAPSHOT_BROWSE_INDEX);
      await db.closeAsync();
      db = undefined;
      if (installed.exists) installed.delete();
      await staged.move(installed);
      new File(this.directory, `${filename}.complete`).write(filename);
      db = await openDatabaseAsync(filename, { useNewConnection: true }, this.directory.uri);
      await this.publish(key, db, filename);
      return db;
    } catch (error) {
      await db?.closeAsync().catch(() => undefined);
      if (error instanceof CatalogError) throw error;
      throw new CatalogError(
        'network_unavailable',
        'The board catalog could not be downloaded. Try again on Wi-Fi.',
      );
    } finally {
      if (downloaded.exists) downloaded.delete();
      const unfinished = new File(this.directory, `${key}.staged`);
      if (unfinished.exists) unfinished.delete();
    }
  }
  private async publish(key: string, db: SQLiteDatabase, filename: string): Promise<void> {
    const previous = this.connections.get(key);
    this.connections.set(key, db);
    this.filenames.set(db, filename);
    if (previous && previous !== db) {
      this.retired.set(previous, key);
      await this.closeRetired(previous);
    }
    await this.prune(key);
  }

  private async closeRetired(db: SQLiteDatabase): Promise<void> {
    const key = this.retired.get(db);
    if (!key || (this.leases.get(db) ?? 0) > 0 || this.closing.has(db)) return;
    this.closing.add(db);
    await db.closeAsync();
    this.retired.delete(db);
    this.filenames.delete(db);
    this.leases.delete(db);
    await this.prune(key);
  }

  private async prune(key: string): Promise<void> {
    const completed = this.directory
      .list()
      .filter(
        (file) =>
          new RegExp(`^${key}-[0-9]+\\.db$`).test(file.name) &&
          new File(this.directory, `${file.name}.complete`).exists,
      )
      .sort((a, b) => b.name.localeCompare(a.name));
    // Keep the newest valid install and one fallback; never delete an active or leased file.
    for (const old of completed.slice(2)) {
      if ([...this.filenames.values()].includes(old.name)) continue;
      new File(this.directory, `${old.name}.complete`).delete();
      new File(this.directory, old.name).delete();
    }
  }
}
