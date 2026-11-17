import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BoardConfiguration } from '@boardclimb/domain';
import { Button, spacing } from '@boardclimb/design-system';

interface ConfigurationChooserProps {
  configurations: readonly BoardConfiguration[];
  selectedId: string | null;
  onChoose: (configuration: BoardConfiguration) => void;
}

/** Select the printed layout/size, then its angle; never render hundreds of angle buttons at once. */
export function ConfigurationChooser({ configurations, selectedId, onChoose }: ConfigurationChooserProps) {
  const [name, setName] = useState<string | null>(null);
  const names = [...new Set(configurations.map((c) => c.name))];
  return (
    <View style={styles.group}>
      {names.map((option) => (
        <View key={option} style={styles.group}>
          <Button
            label={option}
            expanded={name === option}
            variant={name === option ? 'primary' : 'secondary'}
            onPress={() => setName(name === option ? null : option)}
          />
          {name === option ? (
            <View style={styles.angles}>
              {configurations
                .filter((c) => c.name === option)
                .map((c) => (
                  <Button
                    key={c.id}
                    label={c.angleDegrees === null ? 'Use layout' : `${c.angleDegrees}°`}
                    selected={selectedId === c.id}
                    variant={selectedId === c.id ? 'primary' : 'secondary'}
                    onPress={() => onChoose(c)}
                  />
                ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  angles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
