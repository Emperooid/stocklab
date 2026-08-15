import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { colors, spacing, typography } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/types';
import { isValidEmail, validatePassword } from '../../lib/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
type Step = 'request' | 'reset' | 'done';

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const isLoading = useAuthStore((s) => s.isLoading);

  async function handleRequest() {
    setError('');
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    try {
      await requestPasswordReset(email);
      setStep('reset');
    } catch {
      setError('Could not send a reset code. Please try again.');
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
      await resetPassword(email, code.trim(), newPassword);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset your password.');
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
        <Text style={styles.subtitle}>We sent a 6-digit code to {email}. Enter it below with your new password.</Text>

        <View style={styles.form}>
          <Input
            label="Reset code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
          <Input
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="••••••••"
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
      <Text style={styles.subtitle}>Enter your account email and we'll send you a reset code.</Text>

      <View style={styles.form}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />

        {!!error && <FormError message={error} />}

        <Button title="Send Reset Code" onPress={handleRequest} loading={isLoading} style={{ marginTop: spacing.lg }} />
        <Button title="Back to Login" variant="ghost" onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
