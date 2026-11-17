import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, ToggleButton, radii, spacing, useTheme } from '@boardclimb/design-system';
import type { AppContainer } from '../composition/AppContainer';
import { ScreenFrame } from './ScreenFrame';
import { formatDiagnosticEvent } from './presentation/formatDiagnosticEvent';

interface DiagnosticsScreenProps {
  container: AppContainer;
  onBack: () => void;
}

/**
 * Opt-in and in-memory only: counts, codes and durations, never problem names, history or hardware addresses (NFR-008, NFR-009, SEC.2).
 * Styled with warm/charcoal/lime sports editorial direction and generous rounded cards.
 */
export function DiagnosticsScreen({ container, onBack }: DiagnosticsScreenProps) {
  const { colors } = useTheme();
  const { diagnostics } = container;
  const [enabled, setEnabled] = useState(diagnostics.isEnabled());
  const [events, setEvents] = useState(() => diagnostics.snapshot());

  return (
    <ScreenFrame title="Diagnostics" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* PRIVACY & GUARANTEE HERO CARD */}
        <Card style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.badge}>
              <AppText variant="caption" style={[styles.badgeText, { color: colors.textMuted }]}>
                LOCAL TELEMETRY · IN-MEMORY ONLY
              </AppText>
            </View>
          </View>
          <View style={styles.heroTitles}>
            <AppText variant="title" style={styles.boldTitle}>
              System Diagnostics
            </AppText>
            <AppText variant="caption" tone="muted">
              Diagnose Bluetooth and catalog syncing. Records only event names, error codes, and request
              durations in volatile memory. No problem names, climber history, or hardware addresses are ever
              stored or transmitted (NFR-008, NFR-009, SEC.2).
            </AppText>
          </View>
        </Card>

        {/* RECORDING CONTROLS */}
        <Card style={[styles.controlCard, { backgroundColor: colors.surface }]}>
          <ToggleButton
            label="Record diagnostics"
            value={enabled}
            onValueChange={(next) => {
              diagnostics.setEnabled(next);
              setEnabled(next);
              setEvents(diagnostics.snapshot());
            }}
          />

          <View style={styles.controlMetaRow}>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.divider },
              ]}
            >
              <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '700' }}>
                {enabled
                  ? `${events.length} event${events.length === 1 ? '' : 's'} recorded`
                  : 'Recording paused'}
              </AppText>
            </View>

            {enabled ? (
              <Button label="Refresh log" onPress={() => setEvents(diagnostics.snapshot())} />
            ) : null}
          </View>
        </Card>

        {/* EVENT STREAM LIST */}
        <Card style={[styles.streamCard, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.badge}>
              <AppText variant="caption" style={[styles.badgeText, { color: colors.textMuted }]}>
                EVENT STREAM
              </AppText>
            </View>
          </View>

          {events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <AppText tone="muted">
                {enabled
                  ? 'Nothing recorded yet. Connect to a board, browse problems, or tap Light up to capture telemetry.'
                  : 'Recording is turned off. Toggle the control above to start recording diagnostic events.'}
              </AppText>
            </View>
          ) : (
            <View style={styles.eventList}>
              {[...events].reverse().map((event, index) => {
                const formatted = formatDiagnosticEvent(event);
                const parts = formatted.split(' · ');
                const eventName = parts[0] ?? event.name;
                const eventDetails = parts.slice(1).join(' · ');

                return (
                  <View
                    key={`${events.length - index}`}
                    style={[
                      styles.eventItem,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.divider,
                      },
                    ]}
                  >
                    <View style={styles.eventNameRow}>
                      <View
                        style={[
                          styles.eventNameTag,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.controlBorder,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}
                        >
                          {eventName}
                        </AppText>
                      </View>
                      <AppText variant="caption" tone="muted" style={{ fontSize: 12 }}>
                        #{events.length - index}
                      </AppText>
                    </View>
                    {eventDetails ? (
                      <AppText variant="caption" style={[styles.eventDetails, { color: colors.textMuted }]}>
                        {eventDetails}
                      </AppText>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  heroCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitles: {
    gap: spacing.xs,
  },
  boldTitle: {
    fontWeight: '800',
  },
  controlCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  controlMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  countBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  streamCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
  },
  eventList: {
    gap: spacing.sm,
  },
  eventItem: {
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  eventNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventNameTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  eventDetails: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
  },
});
