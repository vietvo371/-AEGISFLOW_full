import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, SPACING, BORDER_RADIUS, TAB_BAR } from '../../theme';

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const insets = useSafeAreaInsets();
    const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12;
    // Assuming Citizen mode has 5 tabs and Emergency mode has 4 tabs
    const isEmergency = state.routes.length === 4;
    const isSosScreen = !isEmergency && state.routes[state.index]?.name === 'SOS';

    if (isSosScreen) {
        return null;
    }
    
    // Emergency Color (Red theme)
    const emergencyActiveColor = '#EF4444'; // Red-500
    const emergencyBgColor = 'rgba(239, 68, 68, 0.1)'; // Light Red transparent

    return (
        <View style={styles.container}>
            <View style={[
                styles.tabBar,
                {
                    paddingBottom: bottomInset,
                    minHeight: 64 + bottomInset,
                },
            ]}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label = options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                    const activeRouteName = state.routes[state.index].name;

                    // Map active nested sub-screens to highlight their parent tabs
                    let isFocused = state.index === index;
                    if (!isFocused) {
                        if (route.name === 'Home') {
                            isFocused = ['Notifications', 'ReportDetail', 'CreateReport', 'EditReport'].includes(activeRouteName);
                        }
                    }

                    // Hidden tabs that should not render a button in the tab bar
                    const HIDDEN_SCREENS = [
                        'SOS',
                        'ReportDetail',
                        'CreateReport',
                        'Notifications',
                        'EditReport'
                    ];

                    if (HIDDEN_SCREENS.includes(route.name)) {
                        // Special check: index 2 (which is 'SOS') is used for the placeholder in citizen mode
                        if (!isEmergency && route.name === 'SOS') {
                            return <View key={route.key} style={styles.tabItemPlaceholder} />;
                        }
                        return null;
                    }

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    const primaryColor = isEmergency ? emergencyActiveColor : theme.colors.primary;

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
                            {/* Animated Pill Container for Emergency (or Citizen can use it too, let's make it look pro for both!) */}
                            <Animated.View style={[
                                styles.iconContainer,
                                isFocused && {
                                    backgroundColor: isEmergency ? emergencyBgColor : `${theme.colors.primary}15`,
                                }
                            ]}>
                                {options.tabBarIcon && options.tabBarIcon({
                                    focused: isFocused,
                                    color: isFocused ? primaryColor : theme.colors.textSecondary,
                                    size: isFocused ? TAB_BAR.iconSize + 2 : TAB_BAR.iconSize
                                })}
                            </Animated.View>

                            <Text style={[
                                styles.tabLabel,
                                { color: isFocused ? primaryColor : theme.colors.textSecondary },
                                isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                            ]}>
                                {typeof label === 'string' ? label : ''}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* FAB Button - Nổi lên, tròn, gradient primary, icon "+" để tạo báo cáo */}
            {!isEmergency && (
                <View style={styles.floatingButtonContainer}>
                    <TouchableOpacity
                        style={styles.floatingButton}
                        onPress={() => navigation.navigate('CreateReport')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={theme.colors.gradientPrimary} // Gradient tím thương hiệu
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.floatingButtonGradient}
                        >
                            <Icon name="plus" size={32} color={theme.colors.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative', // Must be relative so bottom tabs reserve screen space
        backgroundColor: 'transparent',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: theme.colors.white,
        borderTopLeftRadius: BORDER_RADIUS['2xl'],
        borderTopRightRadius: BORDER_RADIUS['2xl'],
        paddingTop: 8,
        paddingHorizontal: SPACING.sm,
        alignItems: 'flex-start',
        ...Platform.select({
            ios: {
                shadowColor: theme.colors.black,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 16,
            },
        }),
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    tabItemPlaceholder: {
        flex: 1,
    },
    iconContainer: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    tabLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    tabLabelActive: {
        fontWeight: '600',
    },
    tabLabelInactive: {
        fontWeight: '400',
    },
    floatingButtonContainer: {
        position: 'absolute',
        top: -30,
        left: '50%',
        marginLeft: -34,
        alignItems: 'center',
        zIndex: 10,
    },
    floatingButton: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: theme.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
        ...Platform.select({
            ios: {
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    floatingButtonGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default CustomTabBar;
