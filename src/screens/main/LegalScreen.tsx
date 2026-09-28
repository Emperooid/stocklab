import { Fragment, ReactNode, useMemo } from 'react';
import { Linking, StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
import { MainStackParamList } from '../../navigation/types';
import { LEGAL_CONTENT, LegalBlock } from '../../content/legalContent';

/**
 * Parses the lightweight **bold** / [label](mailto:address) markup used in
 * legalContent.ts and renders it as nested <Text> — mailto links are
 * tappable. Kept intentionally minimal (just the two patterns actually used
 * in the source documents) rather than a general markdown parser.
 */
function RichText({ text, style }: { text: string; style: StyleProp<TextStyle> }) {
  const tokenPattern = /\*\*(.+?)\*\*|\[(.+?)\]\((mailto:[^)]+)\)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenPattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    if (match[1] !== undefined) {
      parts.push(
        <Text key={key++} style={styles.bold}>
          {match[1]}
        </Text>
      );
    } else if (match[2] !== undefined && match[3] !== undefined) {
      const email = match[3];
      const label = match[2];
      parts.push(
        <Text key={key++} style={styles.link} onPress={() => Linking.openURL(email)}>
          {label}
        </Text>
      );
    }
    lastIndex = tokenPattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return <Text style={style}>{parts}</Text>;
}

export default function LegalScreen() {
  const colors = useColors();
  const componentStyles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<RouteProp<MainStackParamList, 'Legal'>>();
  const doc = LEGAL_CONTENT[route.params.doc];

  return (
    <Screen>
      <Text style={componentStyles.title}>{doc.title}</Text>
      <Text style={componentStyles.updated}>Last updated: {doc.updated}</Text>

      <RichText text={doc.intro} style={componentStyles.intro} />

      {doc.sections.map((section) => (
        <View key={section.title} style={componentStyles.section}>
          <Text style={componentStyles.sectionTitle}>{section.title}</Text>
          {section.blocks.map((block: LegalBlock, i) =>
            block.type === 'p' ? (
              <RichText key={i} text={block.text} style={[componentStyles.paragraph, i > 0 && componentStyles.blockSpacing]} />
            ) : (
              <View key={i} style={[componentStyles.list, i > 0 && componentStyles.blockSpacing]}>
                {block.items.map((item, j) => (
                  <View key={j} style={componentStyles.listRow}>
                    <Text style={componentStyles.bullet}>{'•'}</Text>
                    <RichText text={item} style={componentStyles.listText} />
                  </View>
                ))}
              </View>
            )
          )}
        </View>
      ))}
    </Screen>
  );
}

// Referenced by RichText's inline bold/link styles — defined once, outside
// createStyles, since RichText doesn't re-render per-theme like the screen
// itself does (styles.bold/link intentionally kept static here).
const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
});

function createStyles(colors: Colors) {
  return StyleSheet.create({
    title: { ...typography.h2, color: colors.text },
    updated: { ...typography.tiny, color: colors.textDim, marginTop: spacing.xs, marginBottom: spacing.lg },
    intro: { ...typography.body, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.xl },
    section: { marginBottom: spacing.xl },
    sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
    paragraph: { ...typography.small, color: colors.textMuted, lineHeight: 20 },
    blockSpacing: { marginTop: spacing.sm },
    list: { gap: 6 },
    listRow: { flexDirection: 'row', gap: spacing.xs },
    bullet: { ...typography.small, color: colors.textDim },
    listText: { ...typography.small, color: colors.textMuted, lineHeight: 20, flex: 1 },
  });
}
