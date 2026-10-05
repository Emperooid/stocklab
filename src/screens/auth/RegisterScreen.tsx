import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { Badge } from '../../components/Badge';
import { AppIcon } from '../../components/AppIcon';
import { IconBubble } from '../../components/IconBubble';
import { PageHeader } from '../../components/Decor';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { withAlpha } from '../../lib/color';
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
        <PageHeader
          title="Enter the code"
          subtitle={`We sent a 6-digit code to ${phone}.`}
          icon="mail"
          color={colors.blue}
        />

        <Card tone="info">
          <Input
            label="Verification code"
            leftIcon="lock"
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />

          {!!error && <FormError message={error} />}

          <Button title="Continue" icon="arrow-right" onPress={handleOtpContinue} style={{ marginTop: spacing.lg }} />
          <Button
            title="Resend code"
            icon="refresh"
            variant="ghost"
            onPress={handleSendOtp}
            loading={isLoading}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use a different number"
          onPress={() => setStep('phone')}
          style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        >
          <IconBubble name="phone" size={32} iconSize={16} color={colors.pink} shape="circle" />
          <Text style={styles.pillText}>Use a different number</Text>
          <AppIcon name="chevron-right" size={16} color={colors.textDim} />
        </Pressable>
      </Screen>
    );
  }

  if (step === 'details') {
    return (
      <Screen style={styles.centerContent}>
        <PageHeader
          title="Tell us about you"
          subtitle="Almost done — just a few more details."
          icon="people-outline"
          color={colors.pink}
        />

        <Card tone="surface">
          <View style={styles.verifiedPhoneBox}>
            <View style={styles.verifiedPhoneCopy}>
              <Text style={styles.verifiedPhoneLabel}>Phone number</Text>
              <Text style={styles.verifiedPhoneValue}>{phone}</Text>
            </View>
            <Badge label="Verified" tone="success" icon="check" size="sm" />
          </View>

          <View style={[styles.nameRow, { marginTop: spacing.md }]}>
            <Input label="First name" leftIcon="user-outline" value={firstName} onChangeText={setFirstName} placeholder="Ada" containerStyle={styles.nameInput} />
            <Input label="Last name" leftIcon="user-outline" value={lastName} onChangeText={setLastName} placeholder="Obi" containerStyle={styles.nameInput} />
          </View>

          <Text style={styles.genderLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {(['Male', 'Female'] as Gender[]).map((g) => (
              <TouchableOpacity
                key={g}
                activeOpacity={0.85}
                style={[styles.genderBtn, gender === g && styles.genderBtnSelected]}
                onPress={() => setGender(g)}
              >
                <AppIcon name={g === 'Male' ? 'user-outline' : 'heart'} size={16} color={gender === g ? colors.onPrimary : colors.textMuted} />
                <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Email address"
            leftIcon="mail"
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
            leftIcon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 6 characters"
            containerStyle={{ marginTop: spacing.md }}
          />

          {!!error && <FormError message={error} />}

          <Button title="Create Account" icon="check" onPress={handleCompleteRegistration} loading={isLoading} style={{ marginTop: spacing.lg }} />
        </Card>

        <View style={styles.reassure}>
          <IconBubble name="shield-check" size={42} iconSize={22} color={colors.teal} />
          <View style={styles.reassureCopy}>
            <Text style={styles.reassureTitle}>Your details are encrypted</Text>
            <Text style={styles.reassureText}>Bank-grade security keeps your name, email and password private.</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.centerContent}>
      <View style={styles.brandPill}>
        <AppIcon name="sparkle" size={16} />
        <Text style={styles.brandPillText}>CrowdStock</Text>
      </View>

      <PageHeader
        title="Create your account"
        subtitle="Enter your phone number to get started."
        icon="user-outline"
        color={colors.accent}
      />

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

        <Button title="Send Code" icon="send" onPress={handleSendOtp} loading={isLoading} style={{ marginTop: spacing.lg }} />
      </Card>

      <View style={styles.reassure}>
        <IconBubble name="shield-check" size={42} iconSize={22} color={colors.teal} />
        <View style={styles.reassureCopy}>
          <Text style={styles.reassureTitle}>Your details are encrypted</Text>
          <Text style={styles.reassureText}>We only use your number to secure your account — never to spam you.</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="I already have an account"
        onPress={() => navigation.navigate('Login')}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      >
        <IconBubble name="logout" size={32} iconSize={16} color={colors.pink} shape="circle" />
        <Text style={styles.pillText}>I already have an account</Text>
        <AppIcon name="chevron-right" size={16} color={colors.textDim} />
      </Pressable>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    centerContent: { flexGrow: 1, justifyContent: 'center' },
    brandPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.primaryTint,
      borderWidth: 1,
      borderColor: withAlpha(colors.primary, 0.24),
      marginBottom: spacing.lg,
    },
    brandPillText: { ...typography.small, color: colors.primary, fontWeight: '800', letterSpacing: 0.2 },
    nameRow: { flexDirection: 'row', gap: spacing.sm, minWidth: 0 },
    nameInput: { flex: 1, minWidth: 0 },
    verifiedPhoneBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.successTint,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: withAlpha(colors.success, 0.24),
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    verifiedPhoneCopy: { flex: 1, minWidth: 0 },
    verifiedPhoneLabel: { ...typography.label, color: colors.textMuted },
    verifiedPhoneValue: { ...typography.body, color: colors.text, fontWeight: '800', marginTop: 2 },
    genderLabel: { ...typography.label, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
    genderRow: { flexDirection: 'row', gap: spacing.sm },
    genderBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs + 2,
      height: 48,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    genderBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
    genderText: { ...typography.body, color: colors.text, fontWeight: '800' },
    genderTextSelected: { color: colors.onPrimary },
    reassure: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.xl,
      backgroundColor: colors.tealTint,
      borderWidth: 1,
      borderColor: withAlpha(colors.teal, 0.24),
    },
    reassureCopy: { flex: 1, minWidth: 0 },
    reassureTitle: { ...typography.h3, color: colors.text },
    reassureText: { ...typography.small, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
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
