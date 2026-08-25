import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
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
      const ok = await authenticateWithBiometric('Log in to StockLab');
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
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Ionicons name="trending-up" size={30} color={colors.onPrimary} />
        </View>
        <Text style={styles.logo}>
          STOCK<Text style={{ color: colors.primary }}>LAB</Text>
        </Text>
        <Text style={styles.tagline}>STOCK · PLAY · PROSPER</Text>
      </View>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Log in to continue picking stock.</Text>

      <View style={styles.form}>
        {!!sessionExpiredMessage && (
          <View style={styles.warnBanner}>
            <Ionicons name="time-outline" size={16} color={colors.warning} />
            <Text style={styles.warnBannerText}>{sessionExpiredMessage}</Text>
          </View>
        )}

        {!!infoMessage && (
          <View style={styles.infoBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.infoBannerText}>{infoMessage}</Text>
          </View>
        )}

        <Input
          label="Phone number"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 11))}
          keyboardType="phone-pad"
          placeholder="08012345678"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="••••••••"
          style={{ marginTop: spacing.md }}
        />

        {!!error && <FormError message={error} />}

        <Button title="Log In" onPress={handleLogin} loading={isLoading} style={{ marginTop: spacing.lg }} />

        {biometricReady && (
          <Button
            title="Log in with Face ID / Fingerprint"
            variant="outline"
            onPress={handleBiometricLogin}
            loading={biometricLoading}
            style={{ marginTop: spacing.sm }}
          />
        )}

        <Button
          title="Forgot password?"
          variant="ghost"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={{ marginTop: spacing.sm }}
        />
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>New here?</Text>
        <View style={styles.dividerLine} />
      </View>

      <Button title="Create an account" variant="outline" onPress={() => navigation.navigate('Register')} />
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    header: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xxl },
    logoMark: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    logo: { ...typography.h1, color: colors.text, letterSpacing: 1 },
    tagline: { ...typography.tiny, color: colors.textMuted, letterSpacing: 2, marginTop: spacing.xs },
    title: { ...typography.h2, color: colors.text },
    subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
    form: { gap: spacing.sm },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.successTint,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.xs,
    },
    infoBannerText: { ...typography.small, color: colors.success, flex: 1 },
    warnBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.warningTint,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.xs,
    },
    warnBannerText: { ...typography.small, color: colors.warning, flex: 1 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xl, gap: spacing.md },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { ...typography.small, color: colors.textDim },
  });
}
