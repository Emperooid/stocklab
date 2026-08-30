import { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { Bank } from '../types';

interface BankPickerModalProps {
  visible: boolean;
  banks: Bank[];
  onSelect: (bank: Bank) => void;
  onClose: () => void;
  /** Bundled list can't cover every microfinance/fintech bank — lets the caller fall back to manual entry. */
  onManualEntry: () => void;
}

// Nigeria has dozens of NIP-enabled banks (commercial + microfinance/
// fintech) — a plain scrollable list gets unwieldy fast, so this filters
// as you type instead.
export function BankPickerModal({ visible, banks, onSelect, onClose, onManualEntry }: BankPickerModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => b.name.toLowerCase().includes(q));
  }, [banks, query]);

  function handleClose() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select your bank</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={colors.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search banks"
              placeholderTextColor={colors.textDim}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(b) => b.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  setQuery('');
                  onSelect(item);
                }}
              >
                <Text style={styles.rowText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No banks match "{query}".</Text>}
            ListFooterComponent={
              <TouchableOpacity
                style={styles.manualRow}
                onPress={() => {
                  setQuery('');
                  onManualEntry();
                }}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={styles.manualRowText}>My bank isn't listed — enter it manually</Text>
              </TouchableOpacity>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      maxHeight: '70%',
      paddingBottom: spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { ...typography.h3, color: colors.text },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      paddingHorizontal: spacing.md,
      height: 44,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    searchInput: { ...typography.body, color: colors.text, flex: 1, height: '100%' },
    row: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowText: { ...typography.body, color: colors.text },
    emptyText: { ...typography.small, color: colors.textMuted, textAlign: 'center', padding: spacing.xl },
    manualRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xs,
    },
    manualRowText: { ...typography.small, color: colors.primary, fontWeight: '700', flex: 1 },
  });
}
