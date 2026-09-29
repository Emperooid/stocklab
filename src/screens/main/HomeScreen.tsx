import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { formatMoney } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import { MainTabParamList } from '../../navigation/types';
import { MainStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AUCTION_ITEMS, AUCTION_WINNERS } from '../../data/auctions';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';

export default function HomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation = navigation.getParent<NativeStackNavigationProp<MainStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const { balance, refresh } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [refresh])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  const featured = AUCTION_ITEMS[0];

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>So<Text style={styles.brandAccent}>Cheap</Text></Text>
          <Text style={styles.tagline}>Bid · Save · Get More</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        </View>
      </View>

      <Card style={styles.balanceCard}>
        <View style={styles.balanceIcon}>
          <Ionicons name="wallet-outline" size={21} color={colors.primary} />
        </View>
        <View style={styles.balanceCopy}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balance}>{formatMoney(balance)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Card>

      <View style={styles.hero}>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200' }} style={styles.heroImage} />
        <View style={styles.heroShade} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>TODAY'S AUCTIONS</Text>
          <Text style={styles.heroTitle}>Bid smart. Own more.</Text>
          <Text style={styles.heroSubtitle}>Quality products at prices you choose.</Text>
          <TouchableOpacity style={styles.heroButton} onPress={() => navigation.navigate('Rounds')}>
            <Text style={styles.heroButtonText}>Start bidding</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Live auctions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Rounds')}>
          <Text style={styles.link}>View all</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.featuredCard}>
        <Image source={{ uri: featured.image }} style={styles.featuredImage} />
        <View style={styles.featuredBody}>
          <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE NOW</Text></View>
          <Text style={styles.featuredTitle}>{featured.title}</Text>
          <Text style={styles.featuredMeta}>Highest bid <Text style={styles.accent}>{formatMoney(featured.highestBid)}</Text></Text>
          <Text style={styles.featuredMeta}>{featured.quantity} available · closes {featured.closesAt}</Text>
          <TouchableOpacity style={styles.bidButton} onPress={() => navigation.navigate('Rounds')}>
            <Text style={styles.bidButtonText}>View auction</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </Card>

      <View style={styles.infoRow}>
        <Ionicons name="pricetag-outline" size={19} color={colors.primary} />
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle}>Every bid costs less than ₦100</Text>
          <Text style={styles.infoText}>Bidding closes at the time shown on each product.</Text>
        </View>
      </View>

        <TouchableOpacity style={styles.myBidsCard} onPress={() => stackNavigation?.navigate('MyBids')} activeOpacity={0.8}>
          <View style={styles.myBidsIcon}><Ionicons name="hammer-outline" size={20} color={colors.primary} /></View>
          <View style={styles.providerCopy}>
            <Text style={styles.providerTitle}>Track my bids</Text>
            <Text style={styles.providerText}>See which auctions you are leading or have been outbid on.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

      <TouchableOpacity style={styles.providerCard} onPress={() => stackNavigation?.navigate('Invite')} activeOpacity={0.8}>
        <Ionicons name="storefront-outline" size={24} color={colors.primary} />
        <View style={styles.providerCopy}>
          <Text style={styles.providerTitle}>Are you a provider or seller?</Text>
          <Text style={styles.providerText}>Chat with us to auction your product.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <View>
          <Text style={styles.sectionTitle}>Our winners</Text>
          <Text style={styles.sectionSubtitle}>Real people, real deals.</Text>
        </View>
        <TouchableOpacity onPress={() => stackNavigation?.navigate('Winners')}>
          <Text style={styles.link}>View all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.winnersScroll}>
        {AUCTION_WINNERS.map((winner) => (
          <View key={winner.id} style={styles.winnerCard}>
            <View>
              <Image source={{ uri: winner.image }} style={styles.winnerImage} />
              <View style={styles.winnerBadge}>
                <Ionicons name="trophy" size={11} color={colors.onPrimary} />
                <Text style={styles.winnerBadgeText}>AUCTION WIN</Text>
              </View>
            </View>
            <View style={styles.winnerBody}>
              <Text style={styles.winnerName} numberOfLines={1}>{winner.name}</Text>
              <Text style={styles.winnerProduct} numberOfLines={1}>{winner.product}</Text>
              <View style={styles.winnerBottomRow}>
                <Text style={styles.discount}>{winner.discount}</Text>
                <Text style={styles.winnerDate}>{winner.date}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    brand: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -1 },
    brandAccent: { color: colors.primary },
    tagline: { color: colors.textMuted, fontSize: 11, marginTop: 1, letterSpacing: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary },
    avatarText: { color: colors.primary, fontWeight: '800' },
    balanceCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.lg },
    balanceIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
    balanceCopy: { flex: 1, marginLeft: spacing.md },
    balanceLabel: { ...typography.small, color: colors.textMuted },
    balance: { ...typography.h2, color: colors.text, marginTop: 2 },
    hero: { height: 190, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.xl },
    heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4, 25, 19, 0.68)' },
    heroCopy: { padding: spacing.lg, flex: 1, justifyContent: 'center' },
    heroEyebrow: { color: '#9EF2CA', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    heroTitle: { color: '#FFF', fontSize: 27, fontWeight: '800', marginTop: 5 },
    heroSubtitle: { color: '#D9F8E9', fontSize: 13, marginTop: 4 },
    heroButton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.md },
    heroButtonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    sectionTitle: { ...typography.h2, color: colors.text },
    sectionSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
    link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    featuredCard: { padding: 0, overflow: 'hidden', marginBottom: spacing.lg },
    featuredImage: { width: '100%', height: 150 },
    featuredBody: { padding: spacing.md },
    livePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.successTint, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 5 },
    liveText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
    featuredTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: spacing.sm },
    featuredMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    accent: { color: colors.accent, fontWeight: '800' },
    bidButton: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
    bidButtonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryTint, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
    infoCopy: { marginLeft: spacing.sm, flex: 1 },
    infoTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
    infoText: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
    providerCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
    myBidsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryTint, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
    myBidsIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    providerCopy: { flex: 1, marginLeft: spacing.md },
    providerTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
    providerText: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
    winnersScroll: { gap: spacing.md, paddingRight: spacing.lg },
    winnerCard: { width: 220, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
    winnerImage: { width: '100%', height: 120, backgroundColor: colors.surfaceAlt },
    winnerBadge: { position: 'absolute', top: spacing.sm, right: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5 },
    winnerBadgeText: { color: colors.onPrimary, fontSize: 9, fontWeight: '800' },
    winnerBody: { padding: spacing.md },
    winnerName: { color: colors.text, fontWeight: '800', fontSize: 13 },
    winnerProduct: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
    winnerBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
    discount: { color: colors.primary, backgroundColor: colors.primaryTint, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 4, fontSize: 10, fontWeight: '800' },
    winnerDate: { color: colors.textDim, fontSize: 9 },
  });
}
