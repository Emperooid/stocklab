import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { Mascot } from '../../components/Mascot';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/types';
import { getErrorMessage, isNewDeviceError, isValidPhone } from '../../lib/validation';
import { authenticateWithBiometric, getSavedCredentials, isBiometricAvailable, saveCredentials } from '../../lib/biometric';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [phone, setPhone] = useState(route.params?.prefillPhone ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Set instead of just folding into `error` — this case needs its own
  // banner with a "Reset Password" button, not just red text, since the raw
  // backend message alone gives no indication that Forgot Password is the
  // actual fix.
  const [newDeviceDetected, setNewDeviceDetected] = useState(false);
  const [infoMessage, setInfoMessage] = useState(route.params?.infoMessage ?? '');
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const sessionExpiredMessage = useAuthStore((s) => s.sessionExpiredMessage);
  const clearSessionExpiredMessage = useAuthStore((s) => s.clearSessionExpiredMessage);

  useEffect(() => {
    // Consumes the just-logged-out routing flag the moment this screen is
    // actually reached — see AuthNavigator's initialRouteName.
    useAuthStore.getState().clearJustLoggedOut();
    (async () => {
      let available = false;
      let saved = null as Awaited<ReturnType<typeof getSavedCredentials>>;
      try {
        [available, saved] = await Promise.all([isBiometricAvailable(), getSavedCredentials()]);
      } catch {
        // Best-effort: if the biometric/secure-store probe fails, leave the
        // button hidden and fall back to password — never block the login
        // screen on an optional convenience feature.
        available = false;
        saved = null;
      }
      setBiometricReady(available && !!saved);
      if (__DEV__) {
        console.log('[biometric] available=', available, '| hasSavedCredentials=', !!saved, '| phone=', saved?.phone ?? null);
      }
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
    setNewDeviceDetected(false);
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
      const message = getErrorMessage(e, 'Could not log in. Please try again.');
      if (isNewDeviceError(message)) {
        setNewDeviceDetected(true);
      } else {
        setError(message);
      }
    }
  }

  async function handleBiometricLogin() {
    setError('');
    setInfoMessage('');
    setBiometricLoading(true);
    try {
      const ok = await authenticateWithBiometric('Log in to SoCheap');
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
      <Mascot
        message={
          phone && isValidPhone(phone) ? "Welcome back! Type your password to go in." : "Hello! What's your phone number?"
        }
      />

      <Text style={styles.title}>Log in</Text>

      <View style={[styles.form, { marginTop: spacing.lg }]}>
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

        {newDeviceDetected && (
          <View style={styles.newDeviceBanner}>
            <View style={styles.newDeviceIconCircle}>
              <Ionicons name="shield-checkmark" size={18} color={colors.onPrimary} />
            </View>
            <Text style={styles.newDeviceTitle}>New device? Reset your password</Text>
            <Text style={styles.newDeviceBody}>
              We don't recognize this phone or app install. For your security, reset your password to log in here —
              it only takes a minute.
            </Text>
            <Button
              title="Reset Password"
              onPress={() => navigation.navigate('ForgotPassword', { prefillPhone: phone })}
              style={{ marginTop: spacing.md, width: '100%' }}
            />
          </View>
        )}

        <Button title="Log In" onPress={handleLogin} loading={isLoading} style={{ marginTop: spacing.lg }} />

        {biometricReady && (
          <>
            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <TouchableOpacity
              style={styles.biometricRow}
              onPress={handleBiometricLogin}
              disabled={biometricLoading}
              accessibilityLabel="Log in with Face ID or Fingerprint"
            >
              <View style={styles.biometricCircle}>
                {biometricLoading ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Ionicons name="finger-print" size={28} color={colors.onPrimary} />
                )}
              </View>
              <Text style={styles.biometricBtnText}>Use Face ID / Fingerprint</Text>
            </TouchableOpacity>
          </>
        )}

        <Button
          title="Forgot password?"
          variant="ghost"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={{ marginTop: spacing.sm }}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>New here? </Text>
        <Text style={styles.footerLink} onPress={() => navigation.navigate('Register')}>
          Create an account
        </Text>
      </View>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    title: { ...typography.h1, color: colors.text, marginTop: spacing.xl },
    form: { gap: spacing.sm },
    orDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
    orLine: { flex: 1, height: 1, backgroundColor: colors.border },
    orText: { ...typography.small, color: colors.textDim, fontWeight: '600' },
    biometricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      alignSelf: 'center',
      marginTop: spacing.lg,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    biometricCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    biometricBtnText: { ...typography.body, color: colors.text, fontWeight: '700' },
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
    newDeviceBanner: {
      backgroundColor: colors.primaryTint,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      padding: spacing.md,
      marginTop: spacing.xs,
    },
    newDeviceIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    newDeviceTitle: { ...typography.body, color: colors.text, fontWeight: '700', marginBottom: spacing.xs },
    newDeviceBody: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
    footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
    footerText: { ...typography.body, color: colors.textMuted },
    footerLink: { ...typography.body, color: colors.primary, fontWeight: '700' },
  });
}
