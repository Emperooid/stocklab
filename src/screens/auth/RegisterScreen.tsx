import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { RegisteredButLoginFailedError, useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/types';
import { getErrorMessage, isValidEmail, isValidPhone, validatePassword } from '../../lib/validation';
import { saveCredentials } from '../../lib/biometric';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type Step = 'phone' | 'otp' | 'details';
type Gender = 'Male' | 'Female';

export default function RegisterScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const registerStart = useAuthStore((s) => s.registerStart);
  const registerComplete = useAuthStore((s) => s.registerComplete);
  const isLoading = useAuthStore((s) => s.isLoading);

  async function handleSendOtp() {
    setError('');
    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number (e.g. 08012345678).');
      return;
    }
    try {
      await registerStart(phone);
      setStep('otp');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not send a code to that number.'));
    }
  }

  function handleOtpContinue() {
    setError('');
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }
    // Frontend check only — the backend doesn't verify the code until the
    // final step (G11 combines OTP verification with account creation), so
    // a wrong code will only surface after the details form is submitted.
    setStep('details');
  }

  async function handleCompleteRegistration() {
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter your first and last name.');
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
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    try {
      await registerComplete(phone, fullName, gender, password, otp.trim(), email.trim());
      await saveCredentials(phone, password).catch(() => {}); // best-effort — enables biometric login later
      // No "done" screen needed — RootNavigator swaps to the app automatically
      // once registerComplete signs the user in.
    } catch (e) {
      if (e instanceof RegisteredButLoginFailedError) {
        // The account was created successfully — this is not a failure.
        // Send them to Login instead of showing an error that would invite
        // a retry (which would just hit "already registered").
        navigation.navigate('Login', { infoMessage: e.message, prefillPhone: phone });
        return;
      }
      setError(getErrorMessage(e, 'Could not verify that code or create your account.'));
    }
  }

  if (step === 'otp') {
    return (
      <Screen style={styles.centerContent}>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to {phone}.</Text>

        <View style={styles.form}>
          <Input
            label="Verification code"
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />

          {!!error && <FormError message={error} />}

          <Button title="Continue" onPress={handleOtpContinue} style={{ marginTop: spacing.lg }} />
          <Button title="Resend code" variant="ghost" onPress={handleSendOtp} loading={isLoading} style={{ marginTop: spacing.sm }} />
          <Button title="Use a different number" variant="ghost" onPress={() => setStep('phone')} />
        </View>
      </Screen>
    );
  }

  if (step === 'details') {
    return (
      <Screen style={styles.centerContent}>
        <Text style={styles.title}>Tell us about you</Text>
        <Text style={styles.subtitle}>Almost done — just a few more details.</Text>

        <View style={styles.form}>
          <View style={styles.verifiedPhoneBox}>
            <View>
              <Text style={styles.verifiedPhoneLabel}>Phone number</Text>
              <Text style={styles.verifiedPhoneValue}>{phone}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          </View>

          <View style={[styles.nameRow, { marginTop: spacing.md }]}>
            <Input label="First name" value={firstName} onChangeText={setFirstName} placeholder="Ada" containerStyle={styles.nameInput} />
            <Input label="Last name" value={lastName} onChangeText={setLastName} placeholder="Obi" containerStyle={styles.nameInput} />
          </View>

          <Text style={styles.genderLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {(['Male', 'Female'] as Gender[]).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, gender === g && styles.genderBtnSelected]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
            containerStyle={{ marginTop: spacing.md }}
          />

          <Input
            label="Choose a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 6 characters"
            style={{ marginTop: spacing.md }}
          />

          {!!error && <FormError message={error} />}

          <Button title="Create Account" onPress={handleCompleteRegistration} loading={isLoading} style={{ marginTop: spacing.lg }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.centerContent}>
      <View style={styles.header}>
        <Image source={require('../../../assets/icon.png')} style={styles.logoMark} resizeMode="contain" />
        <Text style={styles.logo}>CrowdStock</Text>
      </View>

      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Enter your phone number to get started.</Text>

      <View style={styles.form}>
        <Input
          label="Phone number"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, '').slice(0, 11))}
          keyboardType="phone-pad"
          placeholder="08012345678"
        />

        {!!error && <FormError message={error} />}

        <Button title="Send Code" onPress={handleSendOtp} loading={isLoading} style={{ marginTop: spacing.lg }} />
        <Button title="I already have an account" variant="ghost" onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    centerContent: { flexGrow: 1, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: spacing.xl },
    logoMark: { width: 64, height: 64, borderRadius: 16, marginBottom: spacing.sm },
    logo: { ...typography.h2, color: colors.text, letterSpacing: 0.2 },
    title: { ...typography.h2, color: colors.text, textAlign: 'center' },
    subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl, textAlign: 'center' },
    form: { gap: spacing.sm },
    nameRow: { flexDirection: 'row', gap: spacing.sm, minWidth: 0 },
    nameInput: { flex: 1, minWidth: 0 },
    verifiedPhoneBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    verifiedPhoneLabel: { ...typography.tiny, color: colors.textMuted },
    verifiedPhoneValue: { ...typography.body, color: colors.text, fontWeight: '600', marginTop: 2 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    verifiedBadgeText: { ...typography.tiny, color: colors.success, fontWeight: '700' },
    genderLabel: { ...typography.small, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs },
    genderRow: { flexDirection: 'row', gap: spacing.sm },
    genderBtn: {
      flex: 1,
      height: 44,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    genderBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    genderText: { ...typography.body, color: colors.text, fontWeight: '600' },
    genderTextSelected: { color: colors.onPrimary },
  });
}
