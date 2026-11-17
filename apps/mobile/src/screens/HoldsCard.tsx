import { StyleSheet, View } from 'react-native';
import { AppText, Card, spacing } from '@boardclimb/design-system';
import type { HoldPlacement } from '@boardclimb/domain';
import { groupHoldsByRole } from './presentation/groupHoldsByRole';

interface HoldsCardProps {
  holds: readonly HoldPlacement[];
}

/** The holds by role. Hold positions are not drawn: the layout geometry is not available from any source yet. */
export function HoldsCard({ holds }: HoldsCardProps) {
  const groups = groupHoldsByRole(holds);
  if (groups.length === 0) return null;
  return (
    <Card>
      <AppText variant="bodyStrong" accessibilityRole="header" aria-level={2}>
        Holds
      </AppText>
      {groups.map((group) => (
        <View key={group.role} style={styles.row}>
          <AppText tone="muted" style={styles.role}>
            {group.label}
          </AppText>
          <AppText style={styles.ids}>{group.holdIds.join(', ')}</AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  role: { width: 64 },
  ids: { flex: 1 },
});
