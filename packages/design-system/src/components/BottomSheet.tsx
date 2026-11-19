import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Animated, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { motion } from '../tokens/motion';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Spoken name of the dimmed area that closes the sheet. */
  closeLabel: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Off-screen start for the panel; the sheet is never taller than the screen, so this always hides it. */
const HIDDEN_OFFSET = 1000;

/**
 * A panel from the bottom edge. The backdrop only fades; the panel alone slides up, so the dimmed screen never
 * moves with it. Fades only when the phone asks for less motion.
 */
export function BottomSheet({ visible, onClose, closeLabel, children, style }: BottomSheetProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduced(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (visible) setMounted(true);
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? motion.screen : motion.content,
      easing: motion.easing,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, progress]);

  const offset = reduced ? 0 : HIDDEN_OFFSET;
  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.panel,
            style,
            {
              opacity: reduced ? progress : 1,
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  panel: { width: '100%', maxWidth: 720, alignSelf: 'center' },
});
