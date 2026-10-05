import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppIcon } from './AppIcon';
import { IconName } from '../theme/icons';
import { withAlpha } from '../lib/color';
import { useColors } from '../theme/theme';

interface IconBubbleProps {
  name: IconName;
  /** Outer bubble size. */
  size?: number;
  iconSize?: number;
  /** Icon colour. Also seeds the tinted background when `background` is omitted. */
  color?: string;
  background?: string;
  shape?: 'circle' | 'squircle';
  style?: StyleProp<ViewStyle>;
}

/**
 * The single most reused shape in the redesign: a soft tinted bubble holding a
 * picture icon. Every list row, stat and callout is built from one of these.
 */
export function IconBubble({
  name,
  size = 46,
  iconSize,
  color,
  background,
  shape = 'squircle',
  style,
}: IconBubbleProps) {
  const colors = useColors();
  const tint = color ?? colors.primary;
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : size * 0.34,
          backgroundColor: background ?? withAlpha(tint, 0.14),
        },
        style,
      ]}
    >
      <AppIcon name={name} size={iconSize ?? Math.round(size * 0.52)} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
