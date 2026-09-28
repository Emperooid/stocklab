import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/types';
import { getErrorMessage, isValidPhone, validatePassword } from '../../lib/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
type Step = 'request' | 'reset' | 'done';

export default function ForgotPasswordScreen({ navigation, route }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<Step>('request');
  const [phone, setPhone] = useState(route.params?.prefillPhone ?? '');
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
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={36} color={colors.onPrimary} />
          </View>
          <Text style={styles.title}>Password reset</Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>
            Your password has been updated. You can log in with your new password now.
          </Text>
          <Button title="Back to Login" onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.xl, width: '100%' }} />
        </View>
      </Screen>
    );
  }

  if (step === 'reset') {
    return (
      <Screen>
        <Text style={styles.title}>Enter reset code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to {phone}. Enter it below with your new password.</Text>

        <View style={styles.form}>
          <Input
            label="Reset code"
            value={code}
            onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
          <Input
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 6 characters"
            style={{ marginTop: spacing.md }}
          />

          {!!error && <FormError message={error} />}

          <Button title="Reset Password" onPress={handleReset} loading={isLoading} style={{ marginTop: spacing.lg }} />
          <Button title="Start over" variant="ghost" onPress={() => setStep('request')} style={{ marginTop: spacing.sm }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Forgot password</Text>
      <Text style={styles.subtitle}>Enter your phone number and we'll send you a reset code.</Text>

      <View style={styles.form}>
        <Input
          label="Phone number"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 11))}
          keyboardType="phone-pad"
          placeholder="08012345678"
        />

        {!!error && <FormError message={error} />}

        <Button title="Send Reset Code" onPress={handleRequest} loading={isLoading} style={{ marginTop: spacing.lg }} />
        <Button title="Back to Login" variant="ghost" onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    title: { ...typography.h2, color: colors.text, marginTop: spacing.lg },
    subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
    form: { gap: spacing.sm },
    centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    successCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
  });
}
