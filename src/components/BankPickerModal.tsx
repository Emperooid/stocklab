import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { IconBubble } from './IconBubble';
import { radius, shadow, spacing, typography, useColors } from '../theme/theme';
import { Bank, NIGERIA_BANKS } from '../lib/banks';

export function BankPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (bank: Bank) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NIGERIA_BANKS;
    return NIGERIA_BANKS.filter((b) => b.name.toLowerCase().includes(q));
  }, [query]);

  function handleSelect(bank: Bank) {
    setQuery('');
    onSelect(bank);
  }

  function handleClose() {
    setQuery('');
    onClose();
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: spacing.lg + insets.bottom }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: colors.textDim }]}>PAYOUT DESTINATION</Text>
              <Text style={[styles.title, { color: colors.text }]}>Select your bank</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={10} style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}>
              <AppIcon name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <AppIcon name="search" size={18} color={colors.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search banks…"
              placeholderTextColor={colors.textDim}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={results}
            keyExtractor={(b) => b.code}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            contentContainerStyle={{ paddingBottom: spacing.lg }}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textMuted }]}>No banks match "{query}".</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.borderLight }]}
                activeOpacity={0.7}
                onPress={() => handleSelect(item)}
              >
                <IconBubble name="bank" size={40} iconSize={20} />
                <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <AppIcon name="chevron-right" size={16} color={colors.textDim} />
              </TouchableOpacity>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    height: '82%',
    ...shadow.lg,
  },
  handle: { width: 48, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  eyebrow: { ...typography.label },
  title: { ...typography.h2, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    marginTop: spacing.lg,
  },
  searchInput: { flex: 1, fontSize: typography.body.fontSize, fontWeight: '600' },
  list: { marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { ...typography.body, flex: 1, fontWeight: '700' },
  emptyText: { ...typography.small, textAlign: 'center', marginTop: spacing.xl },
});
