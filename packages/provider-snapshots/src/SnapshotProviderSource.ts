import type { BoardConfiguration, BoardModel, Manufacturer } from '@boardclimb/domain';
import { CatalogError } from '@boardclimb/catalog-core';
import type {
  CatalogCapabilities,
  ProviderPage,
  ProviderProblemRecord,
  ProviderProblemSummaryRecord,
  ProviderSource,
} from '@boardclimb/catalog-core';
import hardware from '../data/hardware.json';
import type { SnapshotReader } from './SnapshotReader';

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
  constructor(
    private readonly manufacturer: Manufacturer,
    private readonly reader: SnapshotReader,
  ) {}

  async fetchBoards(): Promise<BoardModel[]> {
    return hardware.products
      .filter((p) => p.board_type === this.manufacturer)
      .map((p) => ({ id: String(p.id), manufacturer: this.manufacturer, name: p.name }));
  }

  async fetchConfigurations(boardId: string): Promise<BoardConfiguration[]> {
    const configs: BoardConfiguration[] = [];
    for (const layout of hardware.layouts.filter(
      (l) => l.board_type === this.manufacturer && String(l.product_id) === boardId,
    )) {
      for (const size of hardware.sizes.filter(
        (s) => s.board_type === this.manufacturer && String(s.product_id) === boardId,
      )) {
        if (
          !hardware.combinations.some(
            (c) =>
              c.board_type === this.manufacturer &&
              c.layout_id === layout.id &&
              c.product_size_id === size.id,
          )
        )
          continue;
        const angles =
          this.manufacturer === 'moonboard'
            ? [25, 40]
            : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
        for (const angle of angles)
          configs.push({
            id: `bs-${layout.id}-${size.id}-${angle}`,
            boardId,
            manufacturer: this.manufacturer,
            name: `${layout.name} · ${size.name}`,
            angleDegrees: angle,
          });
      }
    }
    return configs;
  }

  private async config(id: string): Promise<{ layout: number; size: number; angle: number }> {
    const match = /^bs-(\d+)-(\d+)-(\d+)$/.exec(id);
    if (!match) throw new CatalogError('not_found', 'Choose a board layout first.');
    const [, l, s, a] = match;
    const layout = Number(l),
      size = Number(s),
      angle = Number(a);
    const model = hardware.layouts.find((x) => x.board_type === this.manufacturer && x.id === layout);
    if (!model || !(await this.fetchConfigurations(String(model.product_id))).some((c) => c.id === id))
      throw new CatalogError('not_found', 'That layout is not available.');
    return { layout, size, angle };
  }

  private summary(row: ClimbRow): ProviderProblemSummaryRecord {
    const grade = hardware.grades.find(
      (g) => g.board_type === this.manufacturer && g.difficulty === Math.round(row.display_difficulty ?? -1),
    );
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
        const point = hardware.placements.find(
          (p) =>
            p.board_type === this.manufacturer &&
            p.layout_id === layout &&
            p.product_size_id === size &&
            p.id === placement,
        );
        const definition = hardware.roles.find((r) => r.board_type === this.manufacturer && r.id === role);
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
    const grid = hardware.sizes.find((s) => s.board_type === this.manufacturer && s.id === size)!;
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
