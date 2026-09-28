import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { api } from '../../api';
import { DailyHistoryEntry } from '../../types';
import { formatPercent, formatSigned, isGainPositive } from '../../lib/format';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function RoundHistoryScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [entries, setEntries] = useState<DailyHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

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

  const filteredEntries = entries.filter((e) => {
    const d = new Date(`${e.date}T00:00:00`);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const availableYears = useMemo(() => {
    const years = new Set(entries.map((e) => new Date(`${e.date}T00:00:00`).getFullYear()));
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [entries, now]);

  const { totalGains, totalLosses, netGain } = useMemo(() => {
    let gains = 0;
    let losses = 0;
    for (const entry of filteredEntries) {
      for (const round of entry.rounds) {
        const value = round.result?.valueGained;
        if (value === undefined) continue;
        if (value >= 0) gains += value;
        else losses += value;
      }
    }
    return { totalGains: gains, totalLosses: losses, netGain: gains + losses };
  }, [filteredEntries]);

  return (
    <Screen scroll={false}>
      <FlatList
        data={filteredEntries}
        keyExtractor={(e) => e.date}
        refreshing={isLoading}
        onRefresh={load}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        ListHeaderComponent={
          <>
            <View style={styles.filterRow}>
              <FilterPill
                label={MONTH_NAMES[selectedMonth]}
                sublabel="Month"
                onPress={() => setMonthPickerVisible(true)}
              />
              <FilterPill label={String(selectedYear)} sublabel="Year" onPress={() => setYearPickerVisible(true)} />
            </View>

            <Card style={styles.summaryCard}>
              <SummaryStat label="Total Gains" value={formatSigned(totalGains)} color={colors.success} />
              <View style={styles.summaryDivider} />
              <SummaryStat label="Total Losses" value={formatSigned(totalLosses)} color={colors.danger} />
              <View style={styles.summaryDivider} />
              <SummaryStat label="Net Gain" value={formatSigned(netGain)} color={netGain >= 0 ? colors.success : colors.danger} />
            </Card>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No auctions this month"
            message={`No completed auctions in ${MONTH_NAMES[selectedMonth]} ${selectedYear}. Try another month.`}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <DayCard entry={item} expanded={expandedDate === item.date} onToggle={() => setExpandedDate(expandedDate === item.date ? null : item.date)} />
        )}
      />

      <PickerModal
        visible={monthPickerVisible}
        title="Select month"
        options={MONTH_NAMES.map((name, index) => ({ label: name, value: index }))}
        selectedValue={selectedMonth}
        onSelect={(v) => {
          setSelectedMonth(v);
          setMonthPickerVisible(false);
        }}
        onClose={() => setMonthPickerVisible(false)}
      />

      <PickerModal
        visible={yearPickerVisible}
        title="Select year"
        options={availableYears.map((y) => ({ label: String(y), value: y }))}
        selectedValue={selectedYear}
        onSelect={(v) => {
          setSelectedYear(v);
          setYearPickerVisible(false);
        }}
        onClose={() => setYearPickerVisible(false)}
      />
    </Screen>
  );
}

function FilterPill({ label, sublabel, onPress }: { label: string; sublabel: string; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.filterSublabel}>{sublabel}</Text>
      <TouchableOpacity style={styles.filterPill} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={styles.filterPillText}>{label}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function PickerModal<T extends string | number>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { label: string; value: T }[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { paddingBottom: Math.round(spacing.xl + insets.bottom) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => String(o.value)}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalRow} onPress={() => onSelect(item.value)}>
                <Text style={styles.modalRowText}>{item.label}</Text>
                {item.value === selectedValue && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

function DayCard({ entry, expanded, onToggle }: { entry: DailyHistoryEntry; expanded: boolean; onToggle: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const gainColor = entry.totalGain >= 0 ? colors.success : colors.danger;

  return (
    <Card>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.row}>
        <View style={styles.dateIconCircle}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dateText}>{formatDate(entry.date)}</Text>
          <Text style={styles.subText}>{entry.roundsSettled}/{entry.rounds.length} auctions closed</Text>
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
              <Text style={styles.detailLabel}>Auction {r.slot.index}</Text>
              <Text style={styles.detailInfo}>
                {r.prediction ? `bid ${r.prediction.value}` : 'no bid placed'}
                {r.result?.average != null ? ` · Final price ${r.result.average.toFixed(2)}` : ''}
              </Text>
              <Text
                style={[
                  styles.detailGain,
                  {
                    color: isGainPositive(r.result?.valueGained, r.result?.finalOutcome) ? colors.success : colors.danger,
                  },
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

function createStyles(colors: Colors) {
  return StyleSheet.create({
    filterRow: { flexDirection: 'row', gap: spacing.md },
    filterSublabel: { ...typography.tiny, color: colors.textMuted, marginBottom: spacing.xs },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      height: 44,
    },
    filterPillText: { ...typography.body, color: colors.text, fontWeight: '600', flex: 1 },
    summaryCard: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, backgroundColor: colors.surfaceAlt },
    summaryDivider: { width: 1, height: 32, backgroundColor: colors.border },
    summaryLabel: { ...typography.tiny, color: colors.textMuted },
    summaryValue: { ...typography.h3, marginTop: 2 },
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
    modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.text },
    modalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalRowText: { ...typography.body, color: colors.text },
  });
}
