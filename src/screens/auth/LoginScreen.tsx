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
import { getErrorMessage, isValidEmail } from '../../lib/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('ada@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  async function handleLogin() {
    setError('');
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    try {
      await login(email, password);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not log in. Please try again.'));
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
        <Text style={styles.tagline}>PREDICT · PLAY · PROSPER</Text>
      </View>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Log in to continue predicting.</Text>

      <View style={styles.form}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          style={{ marginTop: spacing.md }}
        />

        {!!error && <FormError message={error} />}

        <Button title="Log In" onPress={handleLogin} loading={isLoading} style={{ marginTop: spacing.lg }} />
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

const styles = StyleSheet.create({
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xl, gap: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.small, color: colors.textDim },
});
