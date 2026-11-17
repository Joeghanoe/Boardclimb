import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppText, Button, Card, ToggleButton, spacing } from '@boardclimb/design-system';
import type { AppContainer } from '../composition/AppContainer';
import { ScreenFrame } from './ScreenFrame';
import { formatDiagnosticEvent } from './presentation/formatDiagnosticEvent';

interface DiagnosticsScreenProps {
  container: AppContainer;
  onBack: () => void;
}

/** Opt-in and in memory only: counts, codes and durations, never problem names, history or hardware addresses (NFR-008, NFR-009). */
export function DiagnosticsScreen({ container, onBack }: DiagnosticsScreenProps) {
  const { diagnostics } = container;
  const [enabled, setEnabled] = useState(diagnostics.isEnabled());
  const [events, setEvents] = useState(() => diagnostics.snapshot());

  return (
    <ScreenFrame title="Diagnostics" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.content}>
        <ToggleButton
          label="Record diagnostics"
          value={enabled}
          onValueChange={(next) => {
            diagnostics.setEnabled(next);
            setEnabled(next);
            setEvents(diagnostics.snapshot());
          }}
        />
        {enabled ? <Button label="Refresh" onPress={() => setEvents(diagnostics.snapshot())} /> : null}
        <Card>
          {events.length === 0 ? (
            <AppText tone="muted">{enabled ? 'Nothing recorded yet.' : 'Recording is off.'}</AppText>
          ) : (
            [...events].reverse().map((event, index) => (
              <AppText key={`${events.length - index}`} variant="caption">
                {formatDiagnosticEvent(event)}
              </AppText>
            ))
          )}
        </Card>
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
});
