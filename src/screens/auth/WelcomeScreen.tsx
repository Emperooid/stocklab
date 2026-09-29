import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

/**
 * First screen a person actually decides something on (after the swipe-
 * through Intro, which is purely explanatory). Two big, unambiguous
 * choices — nothing else on the screen competes for attention, since the
 * audience here often isn't used to picking through a form-heavy app.
 *
 * Deliberately no colored hero panel or illustration here — an earlier
 * version used a solid green block with a bar-chart graphic, which read as
 * "too much" against the rest of the app's plain dark screens. Just the
 * logo, the pitch, and the two buttons, sitting directly on the same
 * background every other screen uses.
 */
export default function WelcomeScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Image source={require('../../../assets/icon.png')} style={styles.logoMark} resizeMode="contain" />
        <Text style={styles.brandText}>SoCheap</Text>

        <Text style={styles.headline}>
          Bid smart.{'\n'}
          <Text style={{ color: colors.primary }}>Get more for less.</Text>
        </Text>
        <Text style={styles.subtext}>Bid on quality products, win great deals, and get them delivered to you.</Text>
      </View>

      <View style={styles.actions}>
        <Button title="Create account" onPress={() => navigation.navigate('Register')} />
        <Button title="Log in" variant="outline" onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.sm }} />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    logoMark: { width: 64, height: 64, borderRadius: 16, marginBottom: spacing.md },
    brandText: { ...typography.h3, color: colors.textMuted, fontWeight: '700', marginBottom: spacing.xl },
    headline: { ...typography.h1, color: colors.text, textAlign: 'center', marginBottom: spacing.md, lineHeight: 38 },
    subtext: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
    actions: { padding: spacing.xl, paddingBottom: spacing.lg },
  });
}
