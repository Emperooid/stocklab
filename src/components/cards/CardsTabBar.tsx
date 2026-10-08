import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppIcon } from '../AppIcon';
import { IconName } from '../../theme/icons';
import { cardGame, cardRadius } from '../../theme/cardsTheme';

interface TabMeta {
  icon: IconName;
  label: string;
}

const TAB_META: Record<string, TabMeta> = {
  CardsHome: { icon: 'home-outline', label: 'Home' },
  MyCards: { icon: 'cards-outline', label: 'Cards' },
  Play: { icon: 'card', label: 'Play' },
  Rewards: { icon: 'trophy-outline', label: 'Rewards' },
  Profile: { icon: 'user-outline', label: 'Profile' },
};

const RAISED_SIZE = 62;

/**
 * The card game's own navbar — navy felt with gold, deliberately nothing like
 * the stock-rounds bar (cream bar, violet icons, teal raised button).
 */
export function CardsTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const pad = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.host, { paddingBottom: pad }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const isRaised = route.name === 'Play';

          function handlePress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          }

          if (isRaised) {
            return (
              <View key={route.key} style={styles.raisedSlot}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handlePress}
                  accessibilityRole="button"
                  accessibilityLabel={meta.label}
                  style={[styles.raisedBtn, focused && styles.raisedBtnActive]}
                >
                  <AppIcon name={meta.icon} size={28} color={focused ? cardGame.ink : cardGame.ink} />
                </TouchableOpacity>
                <Text style={[styles.raisedLabel, { color: focused ? cardGame.gold : cardGame.textDim }]}>{meta.label}</Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              onPress={handlePress}
              accessibilityRole="button"
              accessibilityLabel={meta.label}
              style={styles.item}
            >
              <View style={[styles.iconWell, focused && styles.iconWellActive]}>
                <AppIcon name={meta.icon} size={23} color={focused ? cardGame.gold : cardGame.textDim} />
              </View>
              <Text style={[styles.label, { color: focused ? cardGame.gold : cardGame.textDim }]} numberOfLines={1}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { paddingHorizontal: 12, paddingTop: 8, backgroundColor: 'transparent' },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: cardGame.tableDeep,
    borderRadius: cardRadius.panel,
    borderWidth: 1.5,
    borderColor: cardGame.gold,
    height: 72,
    paddingHorizontal: 4,
    shadowColor: cardGame.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 },
  iconWell: { width: 44, height: 34, borderRadius: cardRadius.pill, alignItems: 'center', justifyContent: 'center' },
  iconWellActive: { backgroundColor: 'rgba(247,183,51,0.16)' },
  label: { fontSize: 10.5, fontWeight: '800' },
  raisedSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  raisedBtn: {
    width: RAISED_SIZE,
    height: RAISED_SIZE,
    borderRadius: RAISED_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    backgroundColor: cardGame.gold,
    borderWidth: 4,
    borderColor: cardGame.tableDeep,
    shadowColor: cardGame.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  raisedBtnActive: { backgroundColor: cardGame.magenta },
  raisedLabel: { fontSize: 10.5, fontWeight: '800', marginTop: 2 },
});
