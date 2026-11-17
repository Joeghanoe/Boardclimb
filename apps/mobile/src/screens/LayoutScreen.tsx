import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import type { BoardSelection, DirectoryEntry } from '@boardclimb/application';
import { AppText, Button, Card, Notice, spacing, useTheme } from '@boardclimb/design-system';
import type { AppContainer } from '../composition/AppContainer';
import { ConfigurationChooser } from './ConfigurationChooser';
import { ModeBanner } from './ModeBanner';
import { ScreenFrame } from './ScreenFrame';
import { describeCatalogError } from './presentation/describeCatalogError';
import { describeManufacturer } from './presentation/describeManufacturer';

interface LayoutScreenProps {
  container: AppContainer;
  current: BoardSelection | null;
  onChoose: (selection: BoardSelection) => void;
  onBack: () => void;
}

/** Board-first route: pick a manufacturer's board and layout. One manufacturer failing never hides the others (FR-001, FR-004). */
export function LayoutScreen({ container, current, onChoose, onBack }: LayoutScreenProps) {
  const { colors } = useTheme();
  const [boardKey, setBoardKey] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    container.directory.list().then((listed) => {
      if (!cancelled) setEntries(listed);
    });
    return () => {
      cancelled = true;
    };
  }, [container]);

  return (
    <ScreenFrame title="Board layout" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.content}>
        <ModeBanner mode={container.mode} persistent={container.persistent} />
        {entries === null ? <ActivityIndicator color={colors.primary} /> : null}
        {entries?.map((entry) => (
          <Card key={entry.manufacturer}>
            <AppText variant="title" accessibilityRole="header" aria-level={2}>
              {describeManufacturer(entry.manufacturer)}
            </AppText>
            {entry.ok ? (
              entry.boards.map(({ board, configurations }) => {
                const key = `${entry.manufacturer}-${board.id}`;
                const selected = boardKey === key;
                return (
                  <View key={board.id} style={styles.board}>
                    <Button
                      label={board.name}
                      expanded={selected}
                      variant={selected ? 'primary' : 'secondary'}
                      onPress={() => {
                        setBoardKey(selected ? null : key);
                      }}
                    />
                    {selected ? (
                      <>
                        <AppText variant="bodyStrong">Layout and size</AppText>
                        <ConfigurationChooser
                          configurations={configurations}
                          selectedId={
                            current?.configuration.manufacturer === board.manufacturer
                              ? current.configuration.id
                              : null
                          }
                          onChoose={(configuration) => onChoose({ boardName: board.name, configuration })}
                        />
                      </>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <Notice
                title={describeCatalogError(entry.code).title}
                message={describeCatalogError(entry.code).action}
              />
            )}
          </Card>
        ))}
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  board: { gap: spacing.sm },
});
