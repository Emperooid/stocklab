import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { AUCTION_ITEMS } from '../../data/auctions';
import { useAuctionStore } from '../../store/auctionStore';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
import { formatMoney } from '../../lib/format';

export default function MyBidsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bids = useAuctionStore((state) => state.bids);

  return (
    <Screen>
      <Text style={styles.eyebrow}>YOUR ACTIVITY</Text>
      <Text style={styles.title}>My bids</Text>
      <Text style={styles.subtitle}>Keep track of the auctions you are competing in.</Text>
      {bids.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState icon="hammer-outline" title="No bids yet" message="Your active and past bids will appear here." />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {bids.map((bid) => {
            const auction = AUCTION_ITEMS.find((item) => item.id === bid.auctionId);
            if (!auction) return null;
            const leading = bid.status === 'leading';
            return (
              <Card key={bid.id} style={styles.bidCard}>
                <Image source={{ uri: auction.image }} style={styles.image} />
                <View style={styles.copy}>
                  <Text style={styles.product} numberOfLines={1}>{auction.title}</Text>
                  <Text style={styles.bidAmount}>Your bid {formatMoney(bid.amount)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: leading ? colors.successTint : colors.dangerTint }]}>
                    <Ionicons name={leading ? 'trending-up' : 'trending-down'} size={13} color={leading ? colors.success : colors.danger} />
                    <Text style={[styles.statusText, { color: leading ? colors.success : colors.danger }]}>{leading ? 'Currently leading' : 'Outbid'}</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    title: { ...typography.h1, color: colors.text, marginTop: 4 },
    subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm, marginBottom: spacing.xl },
    emptyCard: { marginTop: spacing.lg },
    bidCard: { flexDirection: 'row', padding: spacing.sm },
    image: { width: 84, height: 84, borderRadius: 10, backgroundColor: colors.surfaceAlt },
    copy: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
    product: { color: colors.text, fontWeight: '800', fontSize: 15 },
    bidAmount: { color: colors.accent, fontWeight: '800', fontSize: 13, marginTop: 5 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4, marginTop: 8 },
    statusText: { fontSize: 10, fontWeight: '800' },
  });
}
