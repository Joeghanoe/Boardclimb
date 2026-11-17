import type { BoardConfiguration, BoardGeometry, BoardModel, Manufacturer } from '@boardclimb/domain';
import { CatalogError } from '@boardclimb/catalog-core';
import type {
  CatalogCapabilities,
  ProviderPage,
  ProviderProblemRecord,
  ProviderProblemSummaryRecord,
  ProviderSource,
} from '@boardclimb/catalog-core';
import hardware from '../data/hardware.json';
import outlineData from '../data/hold-outlines.json';
import type { SnapshotReader } from './SnapshotReader';
import type { HardwareIndex } from './HardwareIndex';
import { indexHardware } from './indexHardware';

interface ClimbRow {
  uuid: string;
  name: string;
  setter_username: string | null;
  frames: string;
  frames_count: number;
  display_difficulty: number | null;
  quality_average: number | null;
}

/** Public BoardSesh snapshots, not its hosted app API. Schema/revision: third-party NOTICE. */
export class SnapshotProviderSource implements ProviderSource {
  readonly capabilities: CatalogCapabilities = {
    pagination: 'cursor',
    ratings: true,
    supportedGradeSystems: ['font'],
    deltaSync: false,
  };
  private readonly index: HardwareIndex;

  constructor(
    private readonly manufacturer: Manufacturer,
    private readonly reader: SnapshotReader,
  ) {
    this.index = indexHardware(manufacturer);
  }

  async fetchBoards(): Promise<BoardModel[]> {
    return hardware.products
      .filter((p) => p.board_type === this.manufacturer)
      .map((p) => ({ id: String(p.id), manufacturer: this.manufacturer, name: p.name }));
  }

  async fetchConfigurations(boardId: string): Promise<BoardConfiguration[]> {
    return (this.index.configurationsByBoard.get(boardId) ?? []).map((configuration) => ({
      ...configuration,
    }));
  }

  /** Bundled full-layout geometry, available without downloading a problem catalog. */
  async fetchBoardGeometry(configurationId: string): Promise<BoardGeometry> {
    const { layout, size } = await this.config(configurationId);
    const outlines =
      (outlineData as Record<string, Record<string, number[]>>)[`${this.manufacturer}/${layout}-${size}`] ??
      {};
    if (this.manufacturer === 'moonboard') {
      const mini = layout === 6 || layout === 7;
      const rows = mini ? 12 : 18;
      const width = 650,
        height = mini ? 694 : 1000;
      const margins = mini ? [0.1047, 0.0508, 0.0793, 0.0571] : [0.1, 0.05, 0.06, 0.04];
      const [left, right, top, bottom] = margins as [number, number, number, number];
      return {
        bounds: { left: 0, right: width, bottom: 0, top: height },
        holds: Object.entries(outlines).map(([holdId, outline]) => {
          const index = Number(holdId) - 1;
          return {
            holdId,
            outline,
            x: (left + (((index % 11) + 0.5) / 11) * (1 - left - right)) * width,
            y: height - (top + ((rows - Math.floor(index / 11) - 0.5) / rows) * (1 - top - bottom)) * height,
            radius: Math.min(width / 11, height / rows) * 0.525,
          };
        }),
      };
    }
    const grid = this.index.sizes.get(size)!;
    const bounds = {
      left: grid.edge_left,
      right: grid.edge_right,
      bottom: grid.edge_bottom,
      top: grid.edge_top,
    };
    return {
      bounds,
      holds: this.index
        .placements(layout, size)
        .all.filter(
          (point) =>
            point.x > bounds.left &&
            point.x < bounds.right &&
            point.y > bounds.bottom &&
            point.y < bounds.top,
        )
        .map((point) => ({
          holdId: String(point.id),
          x: point.x,
          y: point.y,
          radius: 4,
          ...(outlines[String(point.id)] ? { outline: outlines[String(point.id)]! } : {}),
        })),
    };
  }

  private async config(id: string): Promise<{ layout: number; size: number; angle: number }> {
    const match = /^bs-(\d+)-(\d+)-(\d+)$/.exec(id);
    if (!match) throw new CatalogError('not_found', 'Choose a board layout first.');
    const [, l, s, a] = match;
    const layout = Number(l),
      size = Number(s),
      angle = Number(a);
    if (!this.index.configurationIds.has(id))
      throw new CatalogError('not_found', 'That layout is not available.');
    return { layout, size, angle };
  }

  private summary(row: ClimbRow): ProviderProblemSummaryRecord {
    const grade = this.index.gradesByDifficulty.get(Math.round(row.display_difficulty ?? -1));
    return {
      id: row.uuid,
      name: row.name,
      gradeSystem: 'font',
      gradeLabel: grade?.boulder_name ?? 'Not graded',
      rating: row.quality_average,
    };
  }

  private async rows(
    configurationId: string,
    cursor: string | null,
    limit: number,
    problemId?: string,
  ): Promise<ClimbRow[]> {
    const { layout, size, angle } = await this.config(configurationId);
    const db = await this.reader.open(this.manufacturer, layout);
    try {
      return await db.all<ClimbRow>(
        `SELECT c.uuid,c.name,c.setter_username,c.frames,c.frames_count,s.display_difficulty,s.quality_average
      FROM board_climbs c LEFT JOIN board_climb_stats s ON s.board_type=c.board_type AND s.climb_uuid=c.uuid AND s.angle=?
      WHERE c.board_type=? AND c.layout_id=? AND c.is_listed=1 AND COALESCE(c.is_hidden,0)=0 AND COALESCE(c.is_draft,0)=0
      AND c.frames_count=1 AND c.frames<>''
      AND (c.compatible_size_ids IS NULL OR EXISTS (SELECT 1 FROM json_each(c.compatible_size_ids) WHERE value=?))
      AND ${problemId === undefined ? 'c.uuid>?' : 'c.uuid=?'} ORDER BY c.uuid LIMIT ?`,
        [angle, this.manufacturer, layout, size, problemId ?? cursor ?? '', limit],
      );
    } finally {
      await db.release?.();
    }
  }

  async fetchProblemPage(
    configurationId: string,
    cursor: string | null,
    pageSize: number,
  ): Promise<ProviderPage> {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000)
      throw new CatalogError('schema_mismatch', 'Invalid page size.');
    const rows = await this.rows(configurationId, cursor, pageSize + 1);
    const page = rows.slice(0, pageSize);
    return {
      records: page.map((r) => this.summary(r)),
      nextCursor: rows.length > pageSize ? (page.at(-1)?.uuid ?? null) : null,
    };
  }

  async fetchProblem(configurationId: string, id: string): Promise<ProviderProblemRecord> {
    const { layout, size } = await this.config(configurationId);
    const row = (await this.rows(configurationId, null, 1, id))[0];
    if (!row) throw new CatalogError('not_found', 'That problem is not in this layout.');
    if (!/^(p\d+r\d+)+$/.test(row.frames))
      throw new CatalogError('schema_mismatch', 'The hold sequence cannot be read.');
    const placements = this.index.placements(layout, size).byId;
    const holds = row.frames
      .split('p')
      .filter(Boolean)
      .map((part) => {
        const [placement, role] = part.split('r').map(Number);
        if (this.manufacturer === 'moonboard') {
          const roles: Record<number, string> = { 42: 'start', 43: 'hand', 44: 'finish' };
          const rows = layout === 6 || layout === 7 ? 12 : 18;
          if (
            placement === undefined ||
            placement < 1 ||
            placement > 11 * rows ||
            role === undefined ||
            !roles[role]
          )
            throw new CatalogError('schema_mismatch', 'A hold is not supported.');
          return {
            holdId: String(placement),
            role: roles[role]!,
            x: (placement - 1) % 11,
            y: Math.floor((placement - 1) / 11),
          };
        }
        const point = placement === undefined ? undefined : placements.get(placement);
        const definition = role === undefined ? undefined : this.index.roles.get(role);
        const roles: Record<string, string> = {
          start: 'start',
          middle: 'hand',
          finish: 'finish',
          foot: 'foot',
        };
        if (!point || !definition || !roles[definition.name])
          throw new CatalogError('schema_mismatch', 'This layout cannot map every hold safely.');
        return {
          holdId: String(placement),
          role: roles[definition.name]!,
          x: point.x,
          y: point.y,
          ledPosition: point.position,
          ledColor: definition.led_color,
        };
      });
    const grid = this.index.sizes.get(size)!;
    const bounds =
      this.manufacturer === 'moonboard'
        ? { left: 0, right: 10, bottom: 0, top: layout === 6 || layout === 7 ? 11 : 17 }
        : { left: grid.edge_left, right: grid.edge_right, bottom: grid.edge_bottom, top: grid.edge_top };
    return {
      ...this.summary(row),
      holds,
      bounds,
      ...(row.setter_username ? { setter: row.setter_username } : {}),
    };
  }
}
