import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { AppIcon, Illustration } from '../../components/AppIcon';
import { IconBubble } from '../../components/IconBubble';
import { PageHeader } from '../../components/Decor';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { withAlpha } from '../../lib/color';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/types';
import { getErrorMessage, isValidPhone, validatePassword } from '../../lib/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
type Step = 'request' | 'reset' | 'done';

export default function ForgotPasswordScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<Step>('request');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const isLoading = useAuthStore((s) => s.isLoading);

  async function handleRequest() {
    setError('');
    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number (e.g. 08012345678).');
      return;
    }
    try {
      await requestPasswordReset(phone);
      setStep('reset');
    } catch (e) {
      // CONFIRMED live: this used to swallow the real error and always show
      // a generic message, which hid a real backend bug (G20 incorrectly
      // rejecting a genuinely registered phone) behind "try again" with no
      // way to tell what actually went wrong.
      setError(getErrorMessage(e, 'Could not send a reset code. Please try again.'));
    }
  }

  async function handleReset() {
    setError('');
    const passwordError = validatePassword(newPassword);
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }
    if (passwordError) {
      setError(passwordError);
      return;
    }
    try {
      await resetPassword(phone, code.trim(), newPassword);
      setStep('done');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not reset your password.'));
    }
  }

  if (step === 'done') {
    return (
      <Screen scroll={false}>
        <View style={styles.centerWrap}>
          <View style={styles.winArt}>
            <View pointerEvents="none" style={styles.winGlow} />
            <Illustration name="win" size={168} />
          </View>

          <View style={styles.successRing}>
            <View style={styles.successCircle}>
              <AppIcon name="check" size={34} color={colors.onPrimary} />
            </View>
          </View>

          <Text style={styles.title}>Password reset</Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>
            Your password has been updated. You can log in with your new password now.
          </Text>
          <Button title="Back to Login" icon="arrow-right" onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.xl, width: '100%' }} />
        </View>
      </Screen>
    );
  }

  if (step === 'reset') {
    return (
      <Screen>
        <PageHeader
          title="Enter reset code"
          subtitle={`We sent a 6-digit code to ${phone}. Enter it below with your new password.`}
          icon="shield-check"
          color={colors.teal}
        />

        <Card tone="info">
          <Input
            label="Reset code"
            leftIcon="lock"
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
          <Input
            label="New password"
            leftIcon="lock"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 6 characters"
            containerStyle={{ marginTop: spacing.md }}
          />

          {!!error && <FormError message={error} />}

          <Button title="Reset Password" icon="check" onPress={handleReset} loading={isLoading} style={{ marginTop: spacing.lg }} />
        </Card>

        <View style={styles.tease}>
          <IconBubble name="bulb" size={42} iconSize={22} color={colors.amber} />
          <View style={styles.teaseCopy}>
            <Text style={styles.teaseTitle}>Pick something memorable</Text>
            <Text style={styles.teaseText}>At least 6 characters — mix letters and numbers for a stronger password.</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start over"
          onPress={() => setStep('request')}
          style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        >
          <IconBubble name="refresh" size={32} iconSize={16} color={colors.pink} shape="circle" />
          <Text style={styles.pillText}>Start over</Text>
          <AppIcon name="chevron-right" size={16} color={colors.textDim} />
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroArt}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <IconBubble name="lock" size={86} iconSize={40} color={colors.amber} shape="squircle" />
          <View pointerEvents="none" style={styles.heroBadge}>
            <IconBubble name="help" size={34} iconSize={18} color={colors.pink} shape="circle" />
          </View>
        </View>

        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>{"Enter your phone number and we'll send you a reset code."}</Text>
      </View>

      <Card tone="surface">
        <Input
          label="Phone number"
          leftIcon="phone"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 11))}
          keyboardType="phone-pad"
          placeholder="08012345678"
        />

        {!!error && <FormError message={error} />}

        <Button title="Send Reset Code" icon="send" onPress={handleRequest} loading={isLoading} style={{ marginTop: spacing.lg }} />
      </Card>

      <View style={styles.tease}>
        <IconBubble name="clock" size={42} iconSize={22} color={colors.teal} />
        <View style={styles.teaseCopy}>
          <Text style={styles.teaseTitle}>Codes arrive in seconds</Text>
          <Text style={styles.teaseText}>Keep this screen open — the 6-digit code lands as a text message.</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Login"
        onPress={() => navigation.navigate('Login')}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      >
        <IconBubble name="chevron-left" size={32} iconSize={16} color={colors.pink} shape="circle" />
        <Text style={styles.pillText}>Back to Login</Text>
        <AppIcon name="chevron-right" size={16} color={colors.textDim} />
      </Pressable>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    title: { ...typography.h1, color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
    subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl, textAlign: 'center' },
    hero: { alignItems: 'center', marginBottom: spacing.lg },
    heroArt: { width: 160, height: 140, alignItems: 'center', justifyContent: 'center' },
    heroGlow: {
      position: 'absolute',
      width: 132,
      height: 132,
      borderRadius: 66,
      backgroundColor: withAlpha(colors.amber, 0.22),
    },
    heroBadge: { position: 'absolute', top: 4, right: 10 },
    centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    winArt: { width: 200, height: 172, alignItems: 'center', justifyContent: 'center' },
    winGlow: {
      position: 'absolute',
      width: 158,
      height: 158,
      borderRadius: 79,
      backgroundColor: colors.successTint,
    },
    successRing: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.successTint,
      borderWidth: 2,
      borderColor: withAlpha(colors.success, 0.32),
      marginTop: spacing.md,
    },
    successCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tease: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.xl,
      backgroundColor: colors.amberTint,
      borderWidth: 1,
      borderColor: withAlpha(colors.amber, 0.3),
    },
    teaseCopy: { flex: 1, minWidth: 0 },
    teaseTitle: { ...typography.h3, color: colors.text },
    teaseText: { ...typography.small, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
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
  });
}
