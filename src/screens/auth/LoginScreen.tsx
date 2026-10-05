import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { AppIcon, Illustration } from '../../components/AppIcon';
import { IconBubble } from '../../components/IconBubble';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { withAlpha } from '../../lib/color';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/types';
import { getErrorMessage, isValidPhone } from '../../lib/validation';
import { authenticateWithBiometric, getSavedCredentials, isBiometricAvailable, saveCredentials } from '../../lib/biometric';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [phone, setPhone] = useState(route.params?.prefillPhone ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(route.params?.infoMessage ?? '');
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const sessionExpiredMessage = useAuthStore((s) => s.sessionExpiredMessage);
  const clearSessionExpiredMessage = useAuthStore((s) => s.clearSessionExpiredMessage);

  useEffect(() => {
    (async () => {
      const [available, saved] = await Promise.all([isBiometricAvailable(), getSavedCredentials()]);
      setBiometricReady(available && !!saved);
      // Remember the phone number from the last successful login on this
      // device so returning users only need their password (or biometric) —
      // route.params?.prefillPhone (e.g. fresh off registration) still wins.
      if (saved && !route.params?.prefillPhone) {
        setPhone(saved.phone);
      }
    })();
    // Shown once, then cleared — a forced logout (server invalidated the
    // session) would otherwise look like the app randomly signed you out
    // with no explanation.
    return () => clearSessionExpiredMessage();
  }, []);

  async function handleLogin() {
    setError('');
    setInfoMessage('');
    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number (e.g. 08012345678).');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    try {
      await login(phone, password);
      await saveCredentials(phone, password).catch(() => {}); // best-effort — enables biometric login next time
    } catch (e) {
      setError(getErrorMessage(e, 'Could not log in. Please try again.'));
    }
  }

  async function handleBiometricLogin() {
    setError('');
    setInfoMessage('');
    setBiometricLoading(true);
    try {
      const ok = await authenticateWithBiometric('Log in to CrowdStock');
      if (!ok) return;
      const saved = await getSavedCredentials();
      if (!saved) {
        setError('No saved login found on this device. Log in with your password once first.');
        return;
      }
      await login(saved.phone, saved.password);
    } catch (e) {
      setError(getErrorMessage(e, 'Biometric login failed. Please use your password.'));
    } finally {
      setBiometricLoading(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroArt}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <Illustration name="hero" size={172} />
          <View pointerEvents="none" style={styles.heroSparkle}>
            <AppIcon name="sparkle" size={26} />
          </View>
        </View>

        <View style={styles.wordmarkRow}>
          <AppIcon name="sparkle" size={15} />
          <Text style={styles.wordmark}>CrowdStock</Text>
        </View>
        <Text style={styles.tagline}>PREDICT · PLAY · PROSPER</Text>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Log in to continue picking stock.</Text>
      </View>

      <Card tone="surface">
        {!!sessionExpiredMessage && (
          <View style={styles.warnBanner}>
            <IconBubble name="clock" size={34} iconSize={17} color={colors.warning} shape="circle" />
            <Text style={styles.warnBannerText}>{sessionExpiredMessage}</Text>
          </View>
        )}

        {!!infoMessage && (
          <View style={styles.infoBanner}>
            <IconBubble name="check" size={34} iconSize={17} color={colors.success} shape="circle" />
            <Text style={styles.infoBannerText}>{infoMessage}</Text>
          </View>
        )}

        <Input
          label="Phone number"
          leftIcon="phone"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 11))}
          keyboardType="phone-pad"
          placeholder="08012345678"
        />
        <Input
          label="Password"
          leftIcon="lock"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="••••••••"
          containerStyle={{ marginTop: spacing.md }}
        />

        {!!error && <FormError message={error} />}

        <Button title="Log In" icon="arrow-right" onPress={handleLogin} loading={isLoading} style={{ marginTop: spacing.lg }} />

        {biometricReady && (
          <Button
            title="Log in with Face ID / Fingerprint"
            icon="shield-check"
            variant="outline"
            onPress={handleBiometricLogin}
            loading={biometricLoading}
            style={{ marginTop: spacing.sm }}
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forgot password?"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        >
          <IconBubble name="help" size={32} iconSize={16} color={colors.pink} shape="circle" />
          <Text style={styles.pillText}>Forgot password?</Text>
          <AppIcon name="chevron-right" size={16} color={colors.textDim} />
        </Pressable>
      </Card>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>New here?</Text>
        <View style={styles.dividerLine} />
      </View>

      <Card tone="accent" variant="sticker">
        <View style={styles.inviteRow}>
          <IconBubble name="sparkle" size={44} iconSize={24} color={colors.accent} background={colors.surface} />
          <View style={styles.inviteCopy}>
            <Text style={styles.inviteTitle}>Start your streak</Text>
            <Text style={styles.inviteText}>Create an account in under a minute and pick your first stock.</Text>
          </View>
        </View>
        <Button title="Create an account" icon="plus" variant="accent" onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.md }} />
      </Card>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    hero: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
    heroArt: { width: 220, height: 190, alignItems: 'center', justifyContent: 'center' },
    heroGlow: {
      position: 'absolute',
      width: 186,
      height: 186,
      borderRadius: 93,
      backgroundColor: withAlpha(colors.amber, 0.22),
    },
    heroSparkle: { position: 'absolute', top: 2, right: 16 },
    wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
    wordmark: { ...typography.h2, color: colors.primary, letterSpacing: 0.2 },
    tagline: { ...typography.label, color: colors.textMuted, marginTop: spacing.xs },
    title: { ...typography.h1, color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
    subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
    warnBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.warningTint,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    warnBannerText: { ...typography.small, color: colors.warning, flex: 1, fontWeight: '700', lineHeight: 18 },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.successTint,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    infoBannerText: { ...typography.small, color: colors.success, flex: 1, fontWeight: '700', lineHeight: 18 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: spacing.sm,
      marginTop: spacing.lg,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: withAlpha(colors.pink, 0.3),
      backgroundColor: colors.pinkTint,
    },
    pillPressed: { opacity: 0.7 },
    pillText: { ...typography.small, color: colors.pink, fontWeight: '800' },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xl, gap: spacing.md },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { ...typography.small, color: colors.textDim, fontWeight: '700' },
    inviteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    inviteCopy: { flex: 1, minWidth: 0 },
    inviteTitle: { ...typography.h3, color: colors.text },
    inviteText: { ...typography.small, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  });
}
