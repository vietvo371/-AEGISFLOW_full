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

                    const isFocused = state.index === index;

                    // IN CITIZEN MODE: Skip the middle tab (index 2) and render a placeholder for the floating button
                    if (!isEmergency && index === 2) {
                        return <View key={route.key} style={styles.tabItemPlaceholder} />;
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
                                { 
                                    color: isFocused ? primaryColor : theme.colors.textSecondary,
                                    fontWeight: isFocused ? '600' : '400' 
                                }
                            ]}>
                                {typeof label === 'string' ? label : ''}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* SOS FAB Button - Màu đỏ giống web */}
            {!isEmergency && (
                <View style={styles.floatingButtonContainer}>
                    <TouchableOpacity
                        style={styles.floatingButton}
                        onPress={() => navigation.navigate('SOS')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#EF4444', '#DC2626']} // Gradient đỏ cho SOS
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
                shadowColor: '#EF4444',
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
