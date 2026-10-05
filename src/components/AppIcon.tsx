import { Image, ImageStyle, StyleProp } from 'react-native';
import {
  BrandIconName,
  IconName,
  IllustrationName,
  ILLUSTRATIONS,
  iconSource,
  isTinted,
} from '../theme/icons';
import { useColors } from '../theme/theme';

interface AppIconProps {
  name: IconName;
  size?: number;
  /** Only applies to tinted (white-mask) icons — brand artwork keeps its own colours. */
  color?: string;
  style?: StyleProp<ImageStyle>;
  opacity?: number;
}

/**
 * Renders one glyph from the bundled PNG set. Replaces @expo/vector-icons
 * entirely: white-mask icons are recoloured with `tintColor`, full-colour brand
 * artwork is drawn as-is.
 */
export function AppIcon({ name, size = 20, color, style, opacity }: AppIconProps) {
  const colors = useColors();
  const tinted = isTinted(name);
  return (
    <Image
      source={iconSource(name)}
      resizeMode="contain"
      style={[
        { width: size, height: size },
        tinted ? { tintColor: color ?? colors.text } : undefined,
        opacity != null ? { opacity } : undefined,
        style,
      ]}
    />
  );
}

interface IllustrationProps {
  name: IllustrationName;
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
}

/** Large hero artwork (win screens, empty states, auth headers). */
export function Illustration({ name, size = 160, width, height, style }: IllustrationProps) {
  return (
    <Image
      source={ILLUSTRATIONS[name]}
      resizeMode="contain"
      style={[{ width: width ?? size, height: height ?? size }, style]}
    />
  );
}

export type { BrandIconName, IconName, IllustrationName };
