import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { formatMoney } from '../../lib/format';
import { AUCTION_ITEMS, AuctionItem } from '../../data/auctions';
import { useAuctionStore } from '../../store/auctionStore';
import { MainStackParamList } from '../../navigation/types';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';

export default function PredictScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const placeAuctionBid = useAuctionStore((state) => state.placeAuctionBid);
  const [selectedId, setSelectedId] = useState(AUCTION_ITEMS[0].id);
  const [bid, setBid] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const selected = AUCTION_ITEMS.find((item) => item.id === selectedId) ?? AUCTION_ITEMS[0];
  const bidNumber = Number(bid);
  const canBid = bidNumber >= selected.lowestBid;

  function selectItem(item: AuctionItem) {
    setSelectedId(item.id);
    setBid('');
    setSubmitted(false);
  }

  function handlePlaceBid() {
    if (canBid) {
      placeAuctionBid(selected.id, bidNumber);
      setSubmitted(true);
    }
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>BID CENTER</Text>
          <Text style={styles.title}>Make your move</Text>
        </View>
        <View style={styles.feePill}>
          <Ionicons name="flash" size={14} color={colors.accent} />
          <Text style={styles.feeText}>Under ₦100 / bid</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Choose an auction, enter your value, and compete to win.</Text>

      <View style={styles.stepRow}>
        <Step number="1" label="Choose" active colors={colors} />
        <View style={styles.stepLine} />
        <Step number="2" label="Enter bid" active={!!bid} colors={colors} />
        <View style={styles.stepLine} />
        <Step number="3" label="Win & own" active={submitted} colors={colors} />
      </View>

      <Text style={styles.sectionTitle}>Select an auction</Text>
      <View style={styles.productRail}>
        {AUCTION_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.productChip, item.id === selected.id && styles.productChipActive]}
            onPress={() => selectItem(item)}
          >
            <Image source={{ uri: item.image }} style={styles.productChipImage} />
            <Text style={[styles.productChipText, item.id === selected.id && styles.productChipTextActive]} numberOfLines={2}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={styles.bidCard}>
        <View style={styles.productImageWrap}>
          <Image source={{ uri: selected.image }} style={styles.productImage} />
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE AUCTION</Text>
          </View>
        </View>
        <View style={styles.bidCardBody}>
          <Text style={styles.category}>{selected.category}</Text>
          <Text style={styles.productTitle}>{selected.title}</Text>
          <View style={styles.statsRow}>
            <AuctionStat label="Highest bid" value={formatMoney(selected.highestBid)} colors={colors} />
            <AuctionStat label="Lowest bid" value={formatMoney(selected.lowestBid)} colors={colors} />
            <AuctionStat label="Quantity" value={String(selected.quantity)} colors={colors} />
          </View>
          <View style={styles.closeRow}>
            <Ionicons name="time-outline" size={17} color={colors.primary} />
            <Text style={styles.closeText}>Closes {selected.closesAt}</Text>
            <Text style={styles.bidders}>{selected.bidders} bidders</Text>
          </View>

          <Text style={styles.inputLabel}>Your bid value</Text>
          <View style={[styles.inputWrap, bid.length > 0 && styles.inputWrapActive]}>
            <Text style={styles.currency}>₦</Text>
            <TextInput
              value={bid}
              onChangeText={(value) => {
                setBid(value.replace(/[^0-9]/g, ''));
                setSubmitted(false);
              }}
              placeholder={`Minimum ${formatMoney(selected.lowestBid)}`}
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
          <Text style={styles.helper}>Your bid must be at least {formatMoney(selected.lowestBid)}. Bidding cost is less than ₦100.</Text>

          {submitted ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <View style={styles.successCopy}>
                <Text style={styles.successTitle}>Bid ready to submit</Text>
                <Text style={styles.successText}>Your bid is saved on this device for this prototype.</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('MyBids')}><Text style={styles.viewBids}>View</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.placeButton, !canBid && styles.placeButtonDisabled]} onPress={handlePlaceBid} disabled={!canBid}>
              <Ionicons name="hammer-outline" size={18} color={colors.onPrimary} />
              <Text style={styles.placeButtonText}>Place bid</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>

      <View style={styles.deliveryCard}>
        <View style={styles.deliveryIcon}><Ionicons name="cube-outline" size={20} color={colors.primary} /></View>
        <View style={styles.deliveryCopy}>
          <Text style={styles.deliveryTitle}>Win it. We deliver it.</Text>
          <Text style={styles.deliveryText}>Winners are contacted after the auction closes and products are delivered to their location.</Text>
        </View>
      </View>
    </Screen>
  );
}

function Step({ number, label, active, colors }: { number: string; label: string; active: boolean; colors: Colors }) {
  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <View style={{ width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
        <Text style={{ color: active ? colors.onPrimary : colors.textMuted, fontSize: 12, fontWeight: '800' }}>{number}</Text>
      </View>
      <Text style={{ color: active ? colors.text : colors.textMuted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function AuctionStat({ label, value, colors }: { label: string; value: string; colors: Colors }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textMuted, fontSize: 10 }}>{label}</Text>
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800', marginTop: 3 }}>{value}</Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    title: { ...typography.h1, color: colors.text, marginTop: 3 },
    subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
    feePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accentTint, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 7 },
    feeText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
    stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: spacing.xl },
    stepLine: { height: 1, backgroundColor: colors.border, width: 38, marginHorizontal: spacing.sm, marginBottom: 18 },
    sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: spacing.md },
    productRail: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    productChip: { width: 86, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 5, backgroundColor: colors.surface },
    productChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
    productChipImage: { width: 74, height: 56, borderRadius: 8, backgroundColor: colors.surfaceAlt },
    productChipText: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 5, minHeight: 25 },
    productChipTextActive: { color: colors.primary },
    bidCard: { padding: 0, overflow: 'hidden' },
    productImageWrap: { height: 205, position: 'relative' },
    productImage: { width: '100%', height: '100%', backgroundColor: colors.surfaceAlt },
    liveBadge: { position: 'absolute', top: spacing.md, left: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    liveText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
    bidCardBody: { padding: spacing.lg },
    category: { color: colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
    productTitle: { color: colors.text, fontSize: 23, fontWeight: '800', marginTop: 5 },
    statsRow: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
    closeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.md },
    closeText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
    bidders: { color: colors.textMuted, fontSize: 11, marginLeft: 'auto' },
    inputLabel: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
    inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, height: 55 },
    inputWrapActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
    currency: { color: colors.text, fontSize: 20, fontWeight: '800', marginRight: spacing.sm },
    input: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '800', padding: 0 },
    helper: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: spacing.sm },
    placeButton: { height: 52, backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg },
    placeButtonDisabled: { opacity: 0.45 },
    placeButtonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '800' },
    successBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successTint, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
    successCopy: { marginLeft: spacing.sm },
    successTitle: { color: colors.success, fontWeight: '800', fontSize: 13 },
    successText: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
    viewBids: { color: colors.primary, fontSize: 12, fontWeight: '800', marginLeft: spacing.sm },
    deliveryCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
    deliveryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint },
    deliveryCopy: { flex: 1, marginLeft: spacing.md },
    deliveryTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
    deliveryText: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  });
}
