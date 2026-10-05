import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { AppIcon } from '../../components/AppIcon';
import { IconBubble } from '../../components/IconBubble';
import { SectionHeader } from '../../components/SectionHeader';
import { StatTile } from '../../components/StatTile';
import { Colors, radius, shadow, spacing, typography, useColors } from '../../theme/theme';
import { api } from '../../api';
import { DailyHistoryEntry } from '../../types';
import { formatPercent, formatSigned } from '../../lib/format';

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
    <Screen scroll={false} style={styles.screen}>
      <FlatList
        data={filteredEntries}
        keyExtractor={(e) => e.date}
        refreshing={isLoading}
        onRefresh={load}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        ListHeaderComponent={
          <>
            <Card tone="primary" variant="sticker" style={styles.heroWrap}>
              <View style={styles.heroRow}>
                <IconBubble name="trophy" size={52} iconSize={30} background={colors.surface} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.heroEyebrow, { color: colors.primary }]}>PAST ROUNDS</Text>
                  <Text style={[styles.heroTitle, { color: colors.text }]}>
                    {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </Text>
                  <Text style={[styles.heroSub, { color: colors.textMuted }]}>
                    {filteredEntries.length} {filteredEntries.length === 1 ? 'day' : 'days'} settled
                  </Text>
                </View>
              </View>

              <View style={styles.filterRow}>
                <FilterPill
                  label={MONTH_NAMES[selectedMonth]}
                  sublabel="Month"
                  icon="calendar"
                  onPress={() => setMonthPickerVisible(true)}
                />
                <FilterPill
                  label={String(selectedYear)}
                  sublabel="Year"
                  icon="filter"
                  onPress={() => setYearPickerVisible(true)}
                />
              </View>
            </Card>

            <SectionHeader title="Totals for this month" eyebrow="MONTH TALLY" />
            <View style={styles.tilesRow}>
              <StatTile icon="trend-up" label="Total Gains" value={formatSigned(totalGains)} color={colors.success} />
              <StatTile icon="trend-down" label="Total Losses" value={formatSigned(totalLosses)} color={colors.danger} />
            </View>
            <View style={styles.tilesRow}>
              <StatTile
                icon="coin"
                label="Net Gain"
                value={formatSigned(netGain)}
                color={netGain >= 0 ? colors.success : colors.danger}
              />
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            illustration="empty"
            title="No rounds this month"
            message={`No settled rounds in ${MONTH_NAMES[selectedMonth]} ${selectedYear}. Try another month.`}
          />
        }
        ListFooterComponent={
          filteredEntries.length > 0 ? (
            <View style={styles.footerRow}>
              <AppIcon name="sparkle" size={16} color={colors.accent} />
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                Tap any day to see the rounds inside it.
              </Text>
            </View>
          ) : null
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

function FilterPill({
  label,
  sublabel,
  icon,
  onPress,
}: {
  label: string;
  sublabel: string;
  icon: 'calendar' | 'filter';
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={styles.filterSublabel}>{sublabel}</Text>
      <TouchableOpacity style={styles.filterPill} onPress={onPress} activeOpacity={0.7}>
        <IconBubble name={icon} size={28} iconSize={16} color={colors.primary} background={colors.surface} />
        <Text style={styles.filterPillText} numberOfLines={1}>
          {label}
        </Text>
        <AppIcon name="chevron-down" size={15} color={colors.textMuted} />
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
        <View style={[styles.modalSheet, { paddingBottom: spacing.xl + insets.bottom }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <AppIcon name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => String(o.value)}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => {
              const active = item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={[styles.modalRow, active && { backgroundColor: colors.primaryTint }]}
                  onPress={() => onSelect(item.value)}
                >
                  <Text style={[styles.modalRowText, active && { color: colors.primary, fontWeight: '800' }]}>
                    {item.label}
                  </Text>
                  {active && (
                    <View style={[styles.modalCheck, { backgroundColor: colors.primary }]}>
                      <AppIcon name="check" size={13} color={colors.onPrimary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function DayCard({ entry, expanded, onToggle }: { entry: DailyHistoryEntry; expanded: boolean; onToggle: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const gainColor = entry.totalGain >= 0 ? colors.success : colors.danger;

  return (
    <Card>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.row}>
        <IconBubble name="calendar" size={44} iconSize={22} color={gainColor} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.dateText} numberOfLines={1}>
            {formatDate(entry.date)}
          </Text>
          <Text style={styles.subText}>
            {entry.roundsSettled}/{entry.rounds.length} rounds settled
          </Text>
        </View>
        <View style={styles.gainWrap}>
          <View style={[styles.gainPill, { backgroundColor: gainColor + '1F' }]}>
            <AppIcon name={entry.totalGain >= 0 ? 'trend-up' : 'trend-down'} size={12} color={gainColor} />
            <Text style={[styles.gainText, { color: gainColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {formatSigned(entry.totalGain)}
            </Text>
          </View>
          <Text style={[styles.subText, { color: gainColor, fontWeight: '800' }]}>
            {formatPercent(entry.totalChangePercent)}
          </Text>
        </View>
        <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detail}>
          {entry.rounds.map((r) => (
            <View key={r.slot.id} style={styles.detailRow}>
              <Text style={styles.detailLabel}>Round {r.slot.index}</Text>
              <Text style={styles.detailInfo} numberOfLines={1}>
                {r.prediction ? `picked ${r.prediction.value}` : 'no stock pick'}
                {r.result?.average != null ? ` · Avg ${r.result.average.toFixed(2)}` : ''}
              </Text>
              <Text
                style={[
                  styles.detailGain,
                  {
                    color: (r.result?.finalOutcome ? r.result.finalOutcome === 'gain' : (r.result?.valueGained ?? 0) >= 0)
                      ? colors.success
                      : colors.danger,
                  },
                ]}
                numberOfLines={1}
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
    screen: { padding: 0 },
    heroWrap: { paddingBottom: spacing.lg },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    heroEyebrow: { ...typography.label },
    heroTitle: { ...typography.h1, marginTop: 2 },
    heroSub: { ...typography.small, marginTop: 2 },
    filterRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    filterSublabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      height: 52,
    },
    filterPillText: { ...typography.body, color: colors.text, fontWeight: '700', flex: 1 },
    tilesRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    gainWrap: { alignItems: 'flex-end', gap: 3 },
    gainPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      maxWidth: 140,
    },
    dateText: { ...typography.h3, color: colors.text },
    subText: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
    gainText: { ...typography.small, fontWeight: '900' },
    detail: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    detailLabel: { ...typography.small, color: colors.textMuted, width: 64 },
    detailInfo: { ...typography.small, color: colors.text, flex: 1 },
    detailGain: { ...typography.small, fontWeight: '700', width: 90, textAlign: 'right' },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.xl,
    },
    footerText: { ...typography.small },
    modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      ...shadow.lg,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.text },
    modalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      marginBottom: 2,
      borderRadius: radius.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalRowText: { ...typography.body, color: colors.text },
    modalCheck: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  });
}
