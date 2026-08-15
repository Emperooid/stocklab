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
import { getErrorMessage, isValidEmail, validatePassword } from '../../lib/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
  ];

  async function handleRegister() {
    setError('');
    if (!name.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    try {
      await register(name.trim(), email.trim(), password);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not create your account. Please try again.'));
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Join StockGod and start predicting.</Text>

      <View style={styles.form}>
        <Input label="Full name" value={name} onChangeText={setName} placeholder="Ada Obi" />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          style={{ marginTop: spacing.md }}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          style={{ marginTop: spacing.md }}
        />

        {password.length > 0 && (
          <View style={styles.rules}>
            {rules.map((rule) => (
              <View key={rule.label} style={styles.ruleRow}>
                <Ionicons
                  name={rule.met ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={rule.met ? colors.success : colors.textDim}
                />
                <Text style={[styles.ruleText, rule.met && { color: colors.success }]}>{rule.label}</Text>
              </View>
            ))}
          </View>
        )}

        {!!error && <FormError message={error} />}

        <Button title="Create Account" onPress={handleRegister} loading={isLoading} style={{ marginTop: spacing.lg }} />
        <Button title="I already have an account" variant="ghost" onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginTop: spacing.lg },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl },
  form: { gap: spacing.sm },
  rules: { gap: 6, marginTop: spacing.sm, marginBottom: spacing.xs },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ruleText: { ...typography.tiny, color: colors.textDim },
});
