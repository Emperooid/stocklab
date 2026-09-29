import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { formatMoney } from '../../lib/format';
import { AUCTION_CATEGORIES, AUCTION_ITEMS, AuctionItem } from '../../data/auctions';
import { useAuctionStore } from '../../store/auctionStore';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';

export default function RoundsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<AuctionItem | null>(null);
  const [preview, setPreview] = useState<AuctionItem | null>(null);
  const filtered = category === 'All' ? AUCTION_ITEMS : AUCTION_ITEMS.filter((item) => item.category.toLowerCase().includes(category.toLowerCase()));

  return (
    <>
      <Screen>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TODAY'S MARKETPLACE</Text>
            <Text style={styles.title}>Live Auctions</Text>
          </View>
          <View style={styles.feePill}><Ionicons name="hammer-outline" size={15} color={colors.primary} /><Text style={styles.feeText}>Under ₦100 / bid</Text></View>
        </View>
        <Text style={styles.subtitle}>Bid on products, win at your price, and get them delivered.</Text>

        <View style={styles.categories}>
          {AUCTION_CATEGORIES.map((item) => (
            <TouchableOpacity key={item} style={[styles.category, category === item && styles.categoryActive]} onPress={() => setCategory(item)}>
              <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>{filtered.length} products today</Text>
          <TouchableOpacity><Ionicons name="options-outline" size={20} color={colors.textMuted} /></TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {filtered.map((item) => (
            <AuctionCard key={item.id} item={item} onPress={() => setSelected(item)} onImagePress={() => setPreview(item)} />
          ))}
        </View>

        <TouchableOpacity style={styles.winnersLink} onPress={() => navigation.navigate('Winners')}>
          <Ionicons name="trophy-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.winnersTitle}>See auction winners</Text>
            <Text style={styles.winnersText}>View final prices and delivered products</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Screen>
      <BidModal item={selected} onClose={() => setSelected(null)} />
      <ImagePreview item={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function AuctionCard({ item, onPress, onImagePress }: { item: AuctionItem; onPress: () => void; onImagePress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.auctionCard}>
      <TouchableOpacity onPress={onImagePress} activeOpacity={0.9}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.expandBadge}><Ionicons name="expand-outline" size={14} color={colors.onPrimary} /></View>
      </TouchableOpacity>
      <View style={styles.cardBody}>
        <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
        <View style={styles.metricGrid}>
          <Metric label="Max bid" value={formatMoney(item.highestBid)} />
          <Metric label="Lowest bid" value={formatMoney(item.lowestBid)} />
          <Metric label="Market price" value={formatMoney(item.currentMarketPrice)} />
          <Metric label="Available" value={`${item.quantity} units`} />
        </View>
        <View style={styles.metaRow}><Ionicons name="cube-outline" size={12} color={colors.textMuted} /><Text style={styles.metaText}>{item.quantity} available</Text></View>
        <View style={styles.metaRow}><Ionicons name="time-outline" size={12} color={colors.primary} /><Text style={styles.closeText}>Closes {item.closesAt}</Text></View>
        <TouchableOpacity style={styles.bidNow} onPress={onPress}><Text style={styles.bidNowText}>BID NOW</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue} numberOfLines={1}>{value}</Text></View>;
}

function BidModal({ item, onClose }: { item: AuctionItem | null; onClose: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const placeAuctionBid = useAuctionStore((state) => state.placeAuctionBid);
  const amount = Number(value);

  useEffect(() => {
    setValue('');
    setError('');
    setSubmitted(false);
  }, [item?.id]);

  function handlePlaceBid() {
    if (!item) return;
    if (!Number.isFinite(amount) || amount < item.lowestBid || amount > item.highestBid) {
      setError(`Enter a bid between ${formatMoney(item.lowestBid)} and ${formatMoney(item.highestBid)}.`);
      return;
    }
    placeAuctionBid(item.id, amount);
    setSubmitted(true);
    setError('');
  }

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Enter your bid</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.textMuted} /></TouchableOpacity></View>
          <Text style={styles.modalProduct}>{item?.title}</Text>
          <Text style={styles.modalCaption}>{item?.caption}</Text>
          <View style={styles.modalStats}>
            <Text style={styles.modalStat}>Max bid{'\n'}<Text style={styles.modalAccent}>{formatMoney(item?.highestBid ?? 0)}</Text></Text>
            <Text style={styles.modalStat}>Lowest bid{'\n'}<Text style={styles.modalAccent}>{formatMoney(item?.lowestBid ?? 0)}</Text></Text>
            <Text style={styles.modalStat}>Market price{'\n'}<Text style={styles.modalAccent}>{formatMoney(item?.currentMarketPrice ?? 0)}</Text></Text>
            <Text style={styles.modalStat}>Available{'\n'}<Text style={styles.modalAccent}>{item?.quantity} units</Text></Text>
          </View>
          <TextInput value={value} onChangeText={(text) => setValue(text.replace(/[^0-9]/g, ''))} placeholder="Your bid value (₦)" placeholderTextColor={colors.textDim} keyboardType="number-pad" style={styles.bidInput} />
          <Text style={styles.feeNote}>₦100 bid access is debited. Your bid amount is recorded, not debited.</Text>
          {submitted ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.successText}>Bid recorded on this device. Check My Bids for its status.</Text>
            </View>
          ) : (
            <>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              <TouchableOpacity style={styles.confirmButton} onPress={handlePlaceBid}>
                <Text style={styles.confirmText}>Place bid</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ImagePreview({ item, onClose }: { item: AuctionItem | null; onClose: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={item != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.previewBackdrop} onPress={onClose}>
        <Pressable style={styles.previewCard} onPress={(event) => event.stopPropagation()}>
          <TouchableOpacity style={styles.previewClose} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.onPrimary} />
          </TouchableOpacity>
          <Image source={{ uri: item?.image }} style={styles.previewImage} resizeMode="contain" />
          <Text style={styles.previewTitle}>{item?.title}</Text>
          <Text style={styles.previewHint}>View large format</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    title: { ...typography.h1, color: colors.text, marginTop: 3 },
    subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm, marginBottom: spacing.lg },
    feePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryTint, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 7, gap: 5 },
    feeText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
    categories: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    category: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    categoryText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
    categoryTextActive: { color: colors.onPrimary },
    resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    sectionTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    auctionCard: { width: '47.8%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
    productImage: { width: '100%', height: 108, backgroundColor: colors.surfaceAlt },
    expandBadge: { position: 'absolute', right: spacing.xs, bottom: spacing.xs, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay },
    cardBody: { padding: spacing.sm },
    productTitle: { color: colors.text, fontWeight: '800', fontSize: 13, minHeight: 32 },
    caption: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: 4, minHeight: 28 },
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
    metric: { width: '48%', backgroundColor: colors.surfaceAlt, borderRadius: 6, padding: 5 },
    metricLabel: { color: colors.textDim, fontSize: 8 },
    metricValue: { color: colors.accent, fontSize: 10, fontWeight: '800', marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    metaText: { color: colors.textMuted, fontSize: 10 },
    closeText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
    bidNow: { backgroundColor: colors.primary, borderRadius: radius.sm, alignItems: 'center', paddingVertical: 8, marginTop: spacing.sm },
    bidNowText: { color: colors.onPrimary, fontWeight: '800', fontSize: 10 },
    winnersLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.xl },
    winnersTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
    winnersText: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, alignSelf: 'center', marginBottom: spacing.lg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { ...typography.h2, color: colors.text },
    modalProduct: { color: colors.textMuted, marginTop: 5 },
    modalCaption: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
    modalStats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
    modalStat: { color: colors.textMuted, fontSize: 11, lineHeight: 20 },
    modalAccent: { color: colors.accent, fontWeight: '800' },
    previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: spacing.lg },
    previewCard: { alignItems: 'center' },
    previewClose: { alignSelf: 'flex-end', padding: spacing.sm },
    previewImage: { width: '100%', height: 420 },
    previewTitle: { color: colors.onPrimary, fontSize: 18, fontWeight: '800', marginTop: spacing.md },
    previewHint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
    bidInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, padding: spacing.md, marginTop: spacing.lg, fontSize: 17 },
    feeNote: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
    errorText: { color: colors.danger, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
    successBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successTint, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
    successText: { flex: 1, color: colors.success, fontSize: 12, lineHeight: 17, fontWeight: '700' },
    confirmButton: { backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.lg },
    confirmText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  });
}
