import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DepositModal } from '../../components/DepositModal';
import { formatMoney } from '../../lib/format';
import { MainStackParamList } from '../../navigation/types';
import { useWalletStore } from '../../store/walletStore';
import { spacing, typography, useColors } from '../../theme/theme';

export default function LobbyWalletScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const balance = useWalletStore((state) => state.balance);
  const isLoading = useWalletStore((state) => state.isLoading);
  const refresh = useWalletStore((state) => state.refresh);
  const [depositOpen, setDepositOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [refresh])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={8}
            accessibilityLabel="Back to games"
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Card style={styles.balanceCard}>
          <View style={styles.balanceIcon}>
            <Ionicons name="wallet-outline" size={26} color={colors.primary} />
          </View>
          <Text style={styles.balanceLabel}>Available balance</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatMoney(balance)}
            </Text>
          )}
          <Button title="Top up wallet" onPress={() => setDepositOpen(true)} style={styles.topUpButton} />
        </Card>

        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={21} color={colors.primary} />
          <Text style={styles.infoText}>
            Top up with a card or bank transfer — we'll open a secure payment page. Your balance updates as
            soon as the payment is confirmed.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Ready to play?</Text>
        <Pressable style={styles.returnCard} onPress={() => navigation.goBack()}>
          <View style={styles.returnIcon}>
            <Ionicons name="game-controller-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.returnCopy}>
            <Text style={styles.returnTitle}>Choose a game</Text>
            <Text style={styles.returnSubtitle}>Return to the lobby and start playing.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </Pressable>
      </ScrollView>

      <DepositModal visible={depositOpen} onClose={() => setDepositOpen(false)} />
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: typography.h2.fontSize, fontWeight: '800' },
    headerSpacer: { width: 42 },
    balanceCard: { alignItems: 'center', padding: spacing.xl, borderColor: colors.primaryTint },
    balanceIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    balanceLabel: { color: colors.textMuted, fontSize: typography.body.fontSize, fontWeight: '600' },
    balance: { color: colors.text, fontSize: 36, fontWeight: '900', marginTop: spacing.xs },
    loader: { height: 43, marginTop: spacing.xs },
    topUpButton: { alignSelf: 'stretch', marginTop: spacing.lg },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: 14,
      backgroundColor: colors.primaryTint,
    },
    infoText: { flex: 1, color: colors.textMuted, fontSize: typography.small.fontSize, lineHeight: 20 },
    sectionTitle: { color: colors.text, fontSize: typography.h3.fontSize, fontWeight: '800', marginTop: spacing.xxl, marginBottom: spacing.md },
    returnCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    returnIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    returnCopy: { flex: 1, marginLeft: spacing.md },
    returnTitle: { color: colors.text, fontSize: typography.body.fontSize, fontWeight: '800' },
    returnSubtitle: { color: colors.textMuted, fontSize: typography.small.fontSize, marginTop: 3 },
  });
}
