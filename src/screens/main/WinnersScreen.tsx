import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { AUCTION_WINNERS } from '../../data/auctions';
import { Colors, spacing, typography, useColors } from '../../theme/theme';

export default function WinnersScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Screen>
      <Text style={styles.eyebrow}>COMMUNITY</Text>
      <Text style={styles.title}>Auction winners</Text>
      <Text style={styles.subtitle}>Real people, real products, and great deals.</Text>
      <View style={{ gap: spacing.md }}>
        {AUCTION_WINNERS.map((winner) => (
          <Card key={winner.id} style={styles.card}>
            <Image source={{ uri: winner.image }} style={styles.image} />
            <View style={styles.copy}>
              <View style={styles.winLabel}><Ionicons name="trophy" size={12} color={colors.primary} /><Text style={styles.winText}>AUCTION WIN</Text></View>
              <Text style={styles.name}>{winner.name}</Text>
              <Text style={styles.product}>{winner.product}</Text>
              <View style={styles.footer}><Text style={styles.discount}>{winner.discount}</Text><Text style={styles.date}>{winner.date}</Text></View>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    title: { ...typography.h1, color: colors.text, marginTop: 4 },
    subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm, marginBottom: spacing.xl },
    card: { flexDirection: 'row', padding: spacing.sm },
    image: { width: 112, height: 112, borderRadius: 12, backgroundColor: colors.surfaceAlt },
    copy: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
    winLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    winText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
    name: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 8 },
    product: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
    discount: { color: colors.success, backgroundColor: colors.successTint, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4, fontSize: 10, fontWeight: '800' },
    date: { color: colors.textDim, fontSize: 10 },
  });
}
