import { StyleSheet, View } from 'react-native';
import { AppText, spacing, useTheme } from '@boardclimb/design-system';
import type { HoldPlacement, HoldRole } from '@boardclimb/domain';
import { ROLE_COLORS } from '@boardclimb/design-system';
import { ROLE_LETTERS } from './presentation/ROLE_LETTERS';
import { groupHoldsByRole } from './presentation/groupHoldsByRole';

interface HoldsCardProps {
  holds: readonly HoldPlacement[];
}

/** How many holds of each role, with the same badges the board uses. */
export function HoldsCard({ holds }: HoldsCardProps) {
  const { colors } = useTheme();
  const groups = groupHoldsByRole(holds);
  if (groups.length === 0) return null;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={groups.map((g) => `${g.holdIds.length} ${g.label}`).join(', ')}
    >
      {groups.map((group) => {
        const role = group.role as HoldRole;
        const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS.hand;
        const letter = ROLE_LETTERS[role] ?? 'H';
        const isDiamond = role === 'foot';
        const isSquare = role === 'start';
        return (
          <View key={group.role} style={[styles.group, { backgroundColor: colors.surfaceMuted }]}>
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
            <AppText variant="caption" style={styles.count}>
              {group.holdIds.length} {group.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingLeft: spacing.xs + 2,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  roleBadge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  roleBadgeCircle: { borderRadius: 10 },
  roleBadgeSquare: { borderRadius: 5 },
  roleBadgeDiamond: { borderRadius: 3, transform: [{ rotate: '45deg' }] },
  counterRotate: { transform: [{ rotate: '-45deg' }] },
  badgeLetter: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  count: { fontWeight: '700' },
});
