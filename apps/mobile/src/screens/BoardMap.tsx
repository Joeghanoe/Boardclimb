import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Polygon } from 'react-native-svg';
import type { BoardGeometry, Problem } from '@boardclimb/domain';
import { AppText, ROLE_COLORS } from '@boardclimb/design-system';
import { boardHoldShapes } from './presentation/boardHoldShapes';
import { fitBoardCanvas } from './presentation/fitBoardCanvas';

interface BoardMapProps {
  problem: Problem;
  geometry?: BoardGeometry | null;
  maxHeight?: number;
  /** Known width of the space; when given, the board is drawn at its final size on the first frame. */
  maxWidth?: number;
}

/** Complete physical layout with route rings. Geometry and lighting remain separate. */
export function BoardMap({ problem, geometry, maxHeight = 500, maxWidth }: BoardMapProps) {
  const [availableWidth, setAvailableWidth] = useState(300);
  const roles = useMemo(() => new Map(problem.holds.map((hold) => [hold.holdId, hold.role])), [problem]);
  const shapes = useMemo(() => (geometry ? boardHoldShapes(geometry) : []), [geometry]);
  const missing = useMemo(() => {
    const known = new Set(geometry?.holds.map((hold) => hold.holdId));
    return problem.holds.filter((hold) => !known.has(hold.holdId)).length;
  }, [geometry, problem]);
  if (!geometry?.holds.length)
    return (
      <View style={styles.empty}>
        <AppText tone="inverse">Full board layout unavailable</AppText>
        <AppText tone="inverseMuted">Choose another layout or open the hold list in Details.</AppText>
      </View>
    );
  const { bounds, holds } = geometry;
  const boardWidth = bounds.right - bounds.left;
  const boardHeight = bounds.top - bounds.bottom;
  const size = fitBoardCanvas(maxWidth ?? availableWidth, maxHeight, bounds);
  return (
    <View
      style={styles.frame}
      onLayout={(event) => setAvailableWidth(Math.max(1, event.nativeEvent.layout.width))}
    >
      <Svg
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${boardWidth} ${boardHeight}`}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Complete board, ${holds.length} holds. ${problem.holds.length - missing} route holds outlined. Green start, cyan hand, yellow foot, magenta finish. Bottom of the board is at the bottom.`}
      >
        {shapes.map(({ holdId, x, y, radius, points, extent }) => {
          const role = roles.get(holdId);
          return (
            <G key={holdId}>
              {points !== null ? (
                <Polygon
                  points={points}
                  fill={role ? '#B3B7B3' : '#858A85'}
                  stroke="#454A45"
                  strokeWidth={radius * 0.06}
                />
              ) : (
                <Circle cx={x} cy={y} r={radius * 0.55} fill="#747A74" />
              )}
              <Circle cx={x} cy={y} r={radius * 0.09} fill="#333833" />
              {role ? (
                <Circle
                  cx={x}
                  cy={y}
                  r={radius * (extent + 0.15)}
                  fill="none"
                  stroke={ROLE_COLORS[role].bg}
                  strokeWidth={radius * 0.14}
                />
              ) : null}
            </G>
          );
        })}
      </Svg>
      {missing > 0 ? (
        <AppText tone="inverseMuted" variant="caption">
          {missing} route holds are missing from this layout. Check the hold list in Details.
        </AppText>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  frame: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 16, gap: 8 },
});
