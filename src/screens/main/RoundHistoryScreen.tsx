import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { api } from '../../api';
import { DailyHistoryEntry } from '../../types';
import { formatPercent, formatSigned } from '../../lib/format';

export default function RoundHistoryScreen() {
  const [entries, setEntries] = useState<DailyHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const history = await api.rounds.getHistory();
      setEntries(history);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.date}
        refreshing={isLoading}
        onRefresh={load}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No past rounds yet" message="Once a day finishes, it'll show up here." />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <DayCard entry={item} expanded={expandedDate === item.date} onToggle={() => setExpandedDate(expandedDate === item.date ? null : item.date)} />
        )}
      />
    </Screen>
  );
}

function DayCard({ entry, expanded, onToggle }: { entry: DailyHistoryEntry; expanded: boolean; onToggle: () => void }) {
  const gainColor = entry.totalGain >= 0 ? colors.success : colors.danger;

  return (
    <Card>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.row}>
        <View style={styles.dateIconCircle}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateText}>{formatDate(entry.date)}</Text>
          <Text style={styles.subText}>{entry.roundsSettled}/5 rounds settled</Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: spacing.xs }}>
          <Text style={[styles.gainText, { color: gainColor }]}>{formatSigned(entry.totalGain)}</Text>
          <Text style={[styles.subText, { color: gainColor }]}>{formatPercent(entry.totalChangePercent)}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detail}>
          {entry.rounds.map((r) => (
            <View key={r.slot.id} style={styles.detailRow}>
              <Text style={styles.detailLabel}>Round {r.slot.index}</Text>
              <Text style={styles.detailInfo}>
                {r.prediction ? `predicted ${r.prediction.value}` : 'no prediction'}
                {r.result ? ` · SV ${r.result.stockValue}` : ''}
              </Text>
              <Text
                style={[
                  styles.detailGain,
                  { color: (r.result?.valueGained ?? 0) >= 0 ? colors.success : colors.danger },
                ]}
              >
                {r.result ? formatSigned(r.result.valueGained ?? 0) : '—'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: { ...typography.h3, color: colors.text },
  subText: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
  gainText: { ...typography.h3 },
  detail: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailLabel: { ...typography.small, color: colors.textMuted, width: 64 },
  detailInfo: { ...typography.small, color: colors.text, flex: 1 },
  detailGain: { ...typography.small, fontWeight: '700', width: 90, textAlign: 'right' },
});
