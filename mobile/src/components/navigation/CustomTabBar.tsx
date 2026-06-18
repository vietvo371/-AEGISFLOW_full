import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Animated, Modal, TouchableWithoutFeedback } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, SPACING, BORDER_RADIUS, TAB_BAR } from '../../theme';

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const insets = useSafeAreaInsets();
    const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12;
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    
    // Check if we are in Emergency mode by looking for emergency-specific routes
    const isEmergency = state.routes.some(route =>
        ['SituationMap', 'Incidents', 'PriorityRoute'].includes(route.name)
    );
    const activeRouteName = state.routes[state.index]?.name;
    const shouldHideTabBar = [
        'SOS',
        'CreateReport',
        'MyReports',
        'EditReport',
        'ReportDetail',
        'Notifications'
    ].includes(activeRouteName);

    if (shouldHideTabBar) {
        return null;
    }
    
    // Emergency Color (Red theme)
    const emergencyActiveColor = '#EF4444'; // Red-500
    const emergencyBgColor = 'rgba(239, 68, 68, 0.1)'; // Light Red transparent

    const handleActionSelect = (route: string) => {
        setActionSheetVisible(false);
        navigation.navigate(route);
    };

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

                    // Map active nested sub-screens to highlight their parent tabs
                    let isFocused = state.index === index;
                    if (!isFocused) {
                        if (route.name === 'Home') {
                            isFocused = ['Notifications', 'ReportDetail', 'CreateReport', 'EditReport'].includes(activeRouteName);
                        } else if (route.name === 'Profile') {
                            isFocused = ['MyReports'].includes(activeRouteName);
                        }
                    }

                    // Hidden tabs that should not render a button in the tab bar
                    const HIDDEN_SCREENS = [
                        'SOS',
                        'ReportDetail',
                        'CreateReport',
                        'Notifications',
                        'EditReport',
                        'MyReports'
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

            {/* FAB Button - Opens Action Sheet */}
            {!isEmergency && (
                <View style={styles.floatingButtonContainer}>
                    <TouchableOpacity
                        style={styles.floatingButton}
                        onPress={() => setActionSheetVisible(true)}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={theme.colors.gradientPrimary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.floatingButtonGradient}
                        >
                            <Icon name="plus" size={32} color={theme.colors.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            {/* Action Sheet Modal */}
            <Modal
                visible={actionSheetVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setActionSheetVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setActionSheetVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.actionSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                                <View style={styles.dragIndicator} />
                                <Text style={styles.actionSheetTitle}>Bạn muốn báo cáo điều gì?</Text>
                                
                                <TouchableOpacity 
                                    style={[styles.actionButton, styles.sosButton]} 
                                    onPress={() => handleActionSelect('SOS')}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.sosIconContainer}>
                                        <Icon name="phone-alert" size={28} color={theme.colors.white} />
                                    </View>
                                    <View style={styles.actionTextContainer}>
                                        <Text style={styles.sosTitle}>Yêu cầu cứu hộ (SOS)</Text>
                                        <Text style={styles.actionDescription}>Nguy hiểm đến tính mạng, cần cứu hộ khẩn cấp</Text>
                                    </View>
                                    <Icon name="chevron-right" size={24} color="#EF4444" />
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.actionButton} 
                                    onPress={() => handleActionSelect('CreateReport')}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.reportIconContainer}>
                                        <Icon name="image-search" size={28} color={theme.colors.primary} />
                                    </View>
                                    <View style={styles.actionTextContainer}>
                                        <Text style={styles.reportTitle}>Phản ánh ngập lụt / sự cố</Text>
                                        <Text style={styles.actionDescription}>Cung cấp hình ảnh hiện trường để hệ thống AI ghi nhận</Text>
                                    </View>
                                    <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
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
    container: {
        position: 'relative',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    actionSheet: {
        backgroundColor: theme.colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    dragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E5EA',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    actionSheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sosButton: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
    },
    sosIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#EF4444',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    reportIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionTextContainer: {
        flex: 1,
    },
    sosTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#B91C1C',
        marginBottom: 4,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
});

export default CustomTabBar;
