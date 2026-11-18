import type { BoardConfiguration } from '@boardclimb/domain';

export interface ConfigurationGroup {
  key: string;
  /** What the climber reads. Several printed layouts can share one name, so repeats are numbered. */
  label: string;
  /** One configuration per angle, lowest angle first. */
  configurations: BoardConfiguration[];
}

/**
 * One group per printed layout and size, in the order the catalog lists them. The catalog can list two
 * layouts under the same name; they are told apart because the second one repeats an angle the first already has.
 */
export function groupConfigurations(configurations: readonly BoardConfiguration[]): ConfigurationGroup[] {
  const groups: { name: string; configurations: BoardConfiguration[] }[] = [];
  for (const configuration of configurations) {
    const home = groups.find(
      (group) =>
        group.name === configuration.name &&
        !group.configurations.some((other) => other.angleDegrees === configuration.angleDegrees),
    );
    if (home) home.configurations.push(configuration);
    else groups.push({ name: configuration.name, configurations: [configuration] });
  }
  const sameName = (name: string) => groups.filter((group) => group.name === name);
  return groups.map((group) => {
    const siblings = sameName(group.name);
    const label =
      siblings.length === 1 ? group.name : `${group.name} · option ${siblings.indexOf(group) + 1}`;
    return {
      key: group.configurations[0]!.id,
      label,
      configurations: [...group.configurations].sort(
        (a, b) => (a.angleDegrees ?? -1) - (b.angleDegrees ?? -1),
      ),
    };
  });
}
