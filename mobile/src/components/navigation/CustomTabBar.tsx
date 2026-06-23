import React, { useState } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet,
  Platform, Animated, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, SPACING, BORDER_RADIUS, TAB_BAR } from '../../theme';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppTheme } from '../../contexts/ThemeContext';

const IOS_HOME_INDICATOR_SAFE = 34;

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const safeBottom = Platform.OS === 'ios'
    ? Math.max(insets.bottom, IOS_HOME_INDICATOR_SAFE)
    : Math.max(insets.bottom, 8);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const isEmergency = state.routes.some(r =>
    ['SituationMap', 'Incidents', 'PriorityRoute'].includes(r.name)
  );
  const activeRouteName = state.routes[state.index]?.name;
  const HIDDEN_SCREENS = [
    'SOS', 'CreateReport', 'MyReports',
    'EditReport', 'ReportDetail', 'Notifications',
  ];

  if (HIDDEN_SCREENS.includes(activeRouteName)) return null;

  const emergencyActiveColor = '#EF4444';
  const emergencyBgColor = 'rgba(239, 68, 68, 0.1)';

  const handleActionSelect = (route: string) => {
    setActionSheetVisible(false);
    navigation.navigate(route);
  };

  const TAB_VISIBLE_HEIGHT = 56;

  return (
    <View style={styles.wrapper}>
      {/* Tab bar body */}
      <View style={[
        styles.tabBar,
        {
          paddingBottom: safeBottom,
          height: TAB_VISIBLE_HEIGHT + safeBottom,
          backgroundColor: isDark ? colors.card : colors.white,
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        },
      ]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined ? options.tabBarLabel
              : options.title !== undefined ? options.title
                : route.name;

          let isFocused = state.index === index;
          if (!isFocused) {
            if (route.name === 'Home') {
              isFocused = ['Notifications', 'ReportDetail', 'CreateReport', 'EditReport'].includes(activeRouteName);
            } else if (route.name === 'Profile') {
              isFocused = ['MyReports'].includes(activeRouteName);
            }
          }

          if (HIDDEN_SCREENS.includes(route.name)) {
            if (!isEmergency && route.name === 'SOS') {
              return <View key={route.key} style={styles.tabItemPlaceholder} />;
            }
            return null;
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress', target: route.key, canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
          const primaryColor = isEmergency ? emergencyActiveColor : colors.primary;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Animated.View style={[
                styles.iconContainer,
                isFocused && {
                  backgroundColor: isEmergency ? emergencyBgColor : `${colors.primary}20`,
                },
              ]}>
                {options.tabBarIcon?.({
                  focused: isFocused,
                  color: isFocused ? primaryColor : colors.textSecondary,
                  size: isFocused ? TAB_BAR.iconSize + 2 : TAB_BAR.iconSize,
                })}
              </Animated.View>
              <Text style={[
                styles.tabLabel,
                { color: isFocused ? primaryColor : colors.textSecondary },
                isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}>
                {typeof label === 'string' ? label : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* FAB */}
      {!isEmergency && (
        <View style={[styles.floatingButtonContainer, { bottom: TAB_VISIBLE_HEIGHT + safeBottom - TAB_VISIBLE_HEIGHT / 2 - 34 }]}>
          <TouchableOpacity
            style={[
              styles.floatingButton,
              { backgroundColor: isDark ? colors.card : colors.white },
            ]}
            onPress={() => setActionSheetVisible(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.floatingButtonGradient}
            >
              <Icon name="plus" size={30} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Sheet */}
      <Modal
        visible={actionSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionSheetVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setActionSheetVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[
                styles.actionSheet,
                {
                  backgroundColor: isDark ? colors.card : colors.white,
                  paddingBottom: Math.max(insets.bottom, 24),
                },
              ]}>
                <View style={[styles.dragIndicator, { backgroundColor: isDark ? colors.border : '#D1D5DB' }]} />
                <Text style={[styles.actionSheetTitle, { color: colors.text }]}>
                  {t('citizen.sos.sheetQuestion')}
                </Text>

                <TouchableOpacity
                  style={[styles.actionButton, styles.sosButton]}
                  onPress={() => handleActionSelect('SOS')}
                  activeOpacity={0.8}
                >
                  <View style={styles.sosIconContainer}>
                    <Icon name="phone-alert" size={26} color={colors.white} />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.sosTitle}>{t('citizen.sos.sheetSosTitle')}</Text>
                    <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                      {t('citizen.sos.sheetSosDesc')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={22} color="#EF4444" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: isDark ? colors.backgroundSecondary : '#F9FAFB',
                      borderColor: isDark ? colors.border : '#E5E7EB',
                    },
                  ]}
                  onPress={() => handleActionSelect('CreateReport')}
                  activeOpacity={0.8}
                >
                  <View style={styles.reportIconContainer}>
                    <Icon name="image-search" size={26} color={colors.primary} />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={[styles.reportTitle, { color: colors.text }]}>
                      {t('citizen.sos.sheetReportTitle')}
                    </Text>
                    <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                      {t('citizen.sos.sheetReportDesc')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: SPACING.xs,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    paddingBottom: 0,
  },
  tabItemPlaceholder: {
    flex: 1,
  },
  iconContainer: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  tabLabelInactive: {
    fontWeight: '400',
  },

  // FAB
  floatingButtonContainer: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -32,
    zIndex: 20,
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#7a5af8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  floatingButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  actionSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 18,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  sosButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  sosIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 5 },
    }),
  },
  reportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionTextContainer: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 3,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  actionDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
});

export default CustomTabBar;
