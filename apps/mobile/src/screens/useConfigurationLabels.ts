import { useEffect, useState } from 'react';
import type { BoardDirectory } from '@boardclimb/application';
import { describeConfiguration } from './presentation/describeConfiguration';

export function useConfigurationLabels(directory: BoardDirectory): ReadonlyMap<string, string> {
  const [labels, setLabels] = useState<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    let alive = true;
    void directory.list().then((entries) => {
      const next = new Map<string, string>();
      for (const entry of entries)
        if (entry.ok)
          for (const { board, configurations } of entry.boards)
            for (const config of configurations)
              next.set(
                `${config.manufacturer}/${config.id}`,
                `${board.name} · ${describeConfiguration(config)}`,
              );
      if (alive) setLabels(next);
    });
    return () => {
      alive = false;
    };
  }, [directory]);
  return labels;
}
