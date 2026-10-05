import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon } from './AppIcon';
import { IconBubble } from './IconBubble';
import { IconName } from '../theme/icons';
import { radius, spacing, typography, useColors } from '../theme/theme';
import { withAlpha } from '../lib/color';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  iconBackground?: string;
  /** Picture icon on the right instead of the default chevron. */
  trailingIcon?: IconName;
  trailingColor?: string;
  /** Replaces the leading icon bubble entirely (e.g. a letter avatar). */
  leading?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** One tappable row — bubble on the left, text in the middle, chevron/slot right. */
export function ListItem({
  title,
  subtitle,
  icon,
  iconColor,
  iconBackground,
  trailingIcon,
  trailingColor,
  leading,
  right,
  onPress,
  showChevron = false,
  style,
}: ListItemProps) {
  const colors = useColors();
  const content = (
    <>
      {leading ?? (!!icon && <IconBubble name={icon} size={44} iconSize={22} color={iconColor} background={iconBackground} />)}
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
      {trailingIcon && <AppIcon name={trailingIcon} size={18} color={trailingColor ?? colors.textDim} />}
      {showChevron && !trailingIcon && (
        <View style={[styles.chevron, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
          <AppIcon name="chevron-right" size={13} color={colors.primary} />
        </View>
      )}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, { borderColor: colors.borderLight }, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.borderLight },
        pressed && { opacity: 0.65 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textWrap: { flex: 1, minWidth: 0 },
  title: { ...typography.body, fontWeight: '700' },
  subtitle: { ...typography.small, marginTop: 2, lineHeight: 17 },
  chevron: { width: 26, height: 26, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
