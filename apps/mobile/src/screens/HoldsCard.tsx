import { StyleSheet, View } from 'react-native';
import { AppText, Card, spacing, useTheme } from '@boardclimb/design-system';
import type { HoldPlacement, HoldRole } from '@boardclimb/domain';
import { ROLE_COLORS } from '@boardclimb/design-system';
import { ROLE_LETTERS } from './presentation/ROLE_LETTERS';
import { groupHoldsByRole } from './presentation/groupHoldsByRole';

interface HoldsCardProps {
  holds: readonly HoldPlacement[];
}

/**
 * Editorial holds breakdown by climbing role.
 * Displays role badges matching BoardMap visual language, hold counts, and hold identifiers.
 */
export function HoldsCard({ holds }: HoldsCardProps) {
  const { colors } = useTheme();
  const groups = groupHoldsByRole(holds);
  if (groups.length === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <AppText variant="caption" tone="muted" style={styles.sectionCaption}>
            ROUTE SPECIFICATION
          </AppText>
          <AppText variant="bodyStrong" accessibilityRole="header" aria-level={2}>
            Holds breakdown
          </AppText>
        </View>
        <View style={[styles.countBadge, { backgroundColor: colors.surfaceMuted }]}>
          <AppText variant="caption" style={styles.countText}>
            {holds.length} total
          </AppText>
        </View>
      </View>

      <View style={styles.groupsContainer}>
        {groups.map((group) => {
          const role = group.role as HoldRole;
          const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS.hand;
          const letter = ROLE_LETTERS[role] ?? 'H';
          const isDiamond = role === 'foot';
          const isSquare = role === 'start';

          return (
            <View
              key={group.role}
              style={[styles.groupRow, { borderColor: colors.divider, backgroundColor: colors.surfaceMuted }]}
            >
              <View style={styles.roleHeader}>
                <View
                  style={[
                    styles.roleBadge,
                    isDiamond && styles.roleBadgeDiamond,
                    isSquare && styles.roleBadgeSquare,
                    !isDiamond && !isSquare && styles.roleBadgeCircle,
                    { backgroundColor: roleColor.bg, borderColor: roleColor.border },
                  ]}
                >
                  <View style={isDiamond ? styles.counterRotate : undefined}>
                    <AppText style={[styles.badgeLetter, { color: roleColor.text }]}>{letter}</AppText>
                  </View>
                </View>
                <AppText variant="bodyStrong">{group.label}</AppText>
                <AppText tone="muted" variant="caption">
                  ({group.holdIds.length})
                </AppText>
              </View>

              <View style={styles.chipsContainer}>
                {group.holdIds.map((id) => (
                  <View
                    key={id}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.surface, borderColor: colors.controlBorder },
                    ]}
                  >
                    <AppText variant="caption" style={styles.chipText}>
                      {id}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionCaption: {
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  countText: {
    fontWeight: '700',
  },
  groupsContainer: {
    gap: spacing.sm,
  },
  groupRow: {
    padding: spacing.md,
    borderRadius: 14,
    gap: spacing.sm,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roleBadge: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  roleBadgeCircle: {
    borderRadius: 11,
  },
  roleBadgeSquare: {
    borderRadius: 5,
  },
  roleBadgeDiamond: {
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  counterRotate: {
    transform: [{ rotate: '-45deg' }],
  },
  badgeLetter: {
    fontSize: 12,
    fontWeight: '800',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipText: {
    fontWeight: '600',
    fontSize: 12,
  },
});
