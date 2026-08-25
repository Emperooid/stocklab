import { useMemo } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { Bank } from '../types';

interface BankPickerModalProps {
  visible: boolean;
  banks: Bank[];
  onSelect: (bank: Bank) => void;
  onClose: () => void;
}

export function BankPickerModal({ visible, banks, onSelect, onClose }: BankPickerModalProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select your bank</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={banks}
            keyExtractor={(b) => b.code}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
                <Text style={styles.rowText}>{item.name}</Text>
              </TouchableOpacity>
            )}
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
    row: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowText: { ...typography.body, color: colors.text },
  });
}
