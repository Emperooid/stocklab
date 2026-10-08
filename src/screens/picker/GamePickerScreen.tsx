import { useCallback, useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon, Illustration } from '../../components/AppIcon';
import { Colors, radius, shadow, spacing, typography, useColors } from '../../theme/theme';
import { cardGame, cardRadius } from '../../theme/cardsTheme';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import { computeCardStats, openCards, useCardsStore } from '../../store/cardsStore';
import { ROUND_SLOTS } from '../../lib/schedule';
import { formatMoney } from '../../lib/format';
import { MainStackParamList } from '../../navigation/types';

/**
 * The lobby. This is what you land on after signing in, and it deliberately has
 * **no navbar** — the only thing to do here is choose which game to play. Each
 * choice pushes that game's own space, which brings its own bar.
 */
export default function GamePickerScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const user = useAuthStore((s) => s.user);
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const cards = useCardsStore((s) => s.cards);
  const bankroll = useCardsStore((s) => s.bankroll);
  const ensureSeeded = useCardsStore((s) => s.ensureSeeded);
  const settleDue = useCardsStore((s) => s.settleDue);

  useFocusEffect(
    useCallback(() => {
      refreshWallet().catch(() => {});
      ensureSeeded();
      settleDue();
    }, [ensureSeeded, settleDue, refreshWallet])
  );

  const playable = openCards(cards).length;
  const cardStats = computeCardStats(cards);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name?.split(' ')[0] ?? 'Player'}
            </Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('News')} accessibilityLabel="News and alerts">
            <AppIcon name="bell-outline" size={19} color={colors.text} />
          </Pressable>
          <Pressable style={styles.avatar} onPress={() => navigation.navigate('Withdrawal')} accessibilityLabel="Wallet">
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </Pressable>
        </View>

        <View style={styles.balanceStrip}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>WALLET</Text>
            <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatMoney(balance)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>CARD TABLE</Text>
            <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {bankroll == null ? '—' : formatMoney(bankroll)}
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Image source={require('../../../assets/fun/sparkle-star.png')} style={styles.heroSparkle} resizeMode="contain" />
          <Text style={styles.heroTitle}>Pick your game</Text>
          <Text style={styles.heroSub}>
            Two different games, two different tables. Choose one and dive in — you can switch any time.
          </Text>
        </View>

        {/* ── Stock Rounds ─────────────────────────────────────────────── */}
        <Pressable
          onPress={() => navigation.navigate('RoundsGame')}
          accessibilityLabel="Play Stock Rounds"
          style={({ pressed }) => [styles.tile, styles.tileRounds, pressed && styles.tilePressed]}
        >
          <View style={styles.tileGlowViolet} pointerEvents="none" />
          <View style={styles.tileTop}>
            <View style={styles.tileBadge}>
              <Text style={styles.tileBadgeText}>GAME 1</Text>
            </View>
            <View style={styles.tileArtWrap}>
              <Illustration name="hero" size={86} />
            </View>
          </View>
          <Text style={styles.tileTitleLight}>Stock Rounds</Text>
          <Text style={styles.tileBodyLight}>
            Pick a number 1–5 each round. Land closest to the average and take the round.
          </Text>
          <View style={styles.tileFooter}>
            <View style={styles.chipLight}>
              <AppIcon name="calendar" size={14} />
              <Text style={styles.chipTextLight}>{ROUND_SLOTS.length} rounds a day</Text>
            </View>
            <View style={styles.playPillLight}>
              <Text style={styles.playPillTextLight}>Play</Text>
              <AppIcon name="arrow-right" size={14} color={colors.primary} />
            </View>
          </View>
        </Pressable>

        {/* ── CrowdStock Cards ─────────────────────────────────────────── */}
        <Pressable
          onPress={() => navigation.navigate('CardsGame')}
          accessibilityLabel="Play CrowdStock Cards"
          style={({ pressed }) => [styles.tile, styles.tileCards, pressed && styles.tilePressed]}
        >
          <View style={styles.tileGlowGold} pointerEvents="none" />
          <View style={styles.tileTop}>
            <View style={[styles.tileBadge, styles.tileBadgeGold]}>
              <Text style={[styles.tileBadgeText, styles.tileBadgeTextGold]}>GAME 2 · NEW</Text>
            </View>
            <View style={styles.tileArtWrap}>
              <Illustration name="cards" size={96} />
            </View>
          </View>
          <Text style={styles.tileTitleGold}>CrowdStock Cards</Text>
          <Text style={styles.tileBodyGold}>
            Hide a figure and set a price. Someone matches it — or they don't. Winner takes 80% of the pot.
          </Text>
          <View style={styles.tileFooter}>
            <View style={styles.chipGold}>
              <AppIcon name="card" size={14} />
              <Text style={styles.chipTextGold}>
                {playable} {playable === 1 ? 'card' : 'cards'} open
              </Text>
            </View>
            <View style={styles.playPillGold}>
              <Text style={styles.playPillTextGold}>Play</Text>
              <AppIcon name="arrow-right" size={14} color={cardGame.ink} />
            </View>
          </View>
        </Pressable>

        {/* ── rewards teaser ───────────────────────────────────────────── */}
        <View style={styles.teaser}>
          <View style={styles.teaserBubble}>
            <AppIcon name="medal" size={24} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.teaserTitle}>Your rewards</Text>
            <Text style={styles.teaserBody} numberOfLines={2}>
              {cardStats.played > 0
                ? `${formatMoney(cardStats.winnings)} won across ${cardStats.played} card ${cardStats.played === 1 ? 'game' : 'games'} · ${cardStats.winRate}% win rate`
                : 'Play your first card to start building a win record.'}
            </Text>
          </View>
          <Pressable style={styles.teaserBtn} onPress={() => navigation.navigate('CardsGame')}>
            <Text style={styles.teaserBtnText}>Open</Text>
            <AppIcon name="chevron-right" size={13} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.linksRow}>
          {([
            { icon: 'wallet', label: 'Wallet', to: 'Withdrawal' },
            { icon: 'gift', label: 'Invite', to: 'Invite' },
            { icon: 'trophy', label: 'Results', to: 'RoundHistory' },
            { icon: 'megaphone', label: 'News', to: 'News' },
          ] as const).map((l) => (
            <Pressable
              key={l.label}
              style={styles.linkTile}
              onPress={() => navigation.navigate(l.to as never)}
              accessibilityLabel={l.label}
            >
              <AppIcon name={l.icon} size={22} />
              <Text style={styles.linkLabel}>{l.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.footnote}>Predict · Play · Win</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxxl, width: '100%', maxWidth: 520, alignSelf: 'center' },

    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    eyebrow: { ...typography.label, color: colors.textDim },
    name: { ...typography.h1, color: colors.text, marginTop: 1 },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText: { ...typography.h3, color: colors.onPrimary },

    balanceStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      ...shadow.sm,
    },
    balanceItem: { flex: 1, paddingHorizontal: spacing.md },
    balanceDivider: { width: 1, height: 32, backgroundColor: colors.border },
    balanceLabel: { ...typography.label, color: colors.textDim },
    balanceValue: { ...typography.h2, color: colors.text, marginTop: 2 },

    hero: { marginTop: spacing.xl, marginBottom: spacing.lg },
    heroSparkle: { position: 'absolute', right: 6, top: -10, width: 34, height: 34, opacity: 0.9 },
    heroTitle: { ...typography.display, color: colors.text },
    heroSub: { ...typography.body, color: colors.textMuted, marginTop: 6, lineHeight: 21, maxWidth: 380 },

    tile: { borderRadius: radius.xxl, padding: spacing.lg, marginBottom: spacing.lg, overflow: 'hidden' },
    tilePressed: { transform: [{ scale: 0.985 }] },
    tileRounds: { backgroundColor: colors.primary },
    tileCards: { backgroundColor: cardGame.tableDeep, borderWidth: 2, borderColor: cardGame.gold },
    tileGlowViolet: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: -80, right: -60, backgroundColor: colors.accent, opacity: 0.5 },
    tileGlowGold: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: -80, right: -60, backgroundColor: cardGame.gold, opacity: 0.22 },

    tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    tileBadge: {
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      alignSelf: 'flex-start',
    },
    tileBadgeGold: { backgroundColor: 'rgba(247,183,51,0.18)' },
    tileBadgeText: { ...typography.label, color: '#FFFFFF' },
    tileBadgeTextGold: { color: cardGame.gold },
    tileArtWrap: { marginTop: -6, marginRight: -4 },

    tileTitleLight: { ...typography.h1, color: '#FFFFFF', marginTop: spacing.sm },
    tileBodyLight: { ...typography.small, color: 'rgba(255,255,255,0.86)', marginTop: 6, lineHeight: 19 },
    tileTitleGold: { ...typography.h1, color: cardGame.gold, marginTop: spacing.sm },
    tileBodyGold: { ...typography.small, color: cardGame.textMuted, marginTop: 6, lineHeight: 19 },

    tileFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, gap: spacing.sm },
    chipLight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexShrink: 1,
    },
    chipTextLight: { ...typography.tiny, color: '#FFFFFF', fontWeight: '800' },
    chipGold: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(247,183,51,0.16)',
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: 'rgba(247,183,51,0.4)',
      flexShrink: 1,
    },
    chipTextGold: { ...typography.tiny, color: cardGame.gold, fontWeight: '800' },
    playPillLight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.cream,
      borderRadius: radius.pill,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    playPillTextLight: { ...typography.small, color: colors.primary, fontWeight: '900' },
    playPillGold: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: cardGame.gold,
      borderRadius: cardRadius.pill,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    playPillTextGold: { ...typography.small, color: cardGame.ink, fontWeight: '900' },

    teaser: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.amberTint,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: 'rgba(255,176,32,0.35)',
      padding: spacing.md,
    },
    teaserBubble: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    teaserTitle: { ...typography.body, color: colors.text, fontWeight: '900' },
    teaserBody: { ...typography.tiny, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
    teaserBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    teaserBtnText: { ...typography.small, color: colors.primary, fontWeight: '900' },

    linksRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    linkTile: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkLabel: { ...typography.tiny, color: colors.textMuted, fontWeight: '800' },

    footnote: { ...typography.label, color: colors.textDim, textAlign: 'center', marginTop: spacing.xl },
  });
}
