import React, { useEffect, useRef } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Text, Animated, Platform } from "react-native";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, ICON_SIZE, wp } from "../theme";

interface ModalCustomProps {
    isModalVisible: boolean;
    setIsModalVisible: (isModalVisible: boolean) => void;
    title: string;
    children: React.ReactNode;
    isAction?: boolean;
    isClose?: boolean;
    onPressAction?: () => void;
    actionText?: string;
    closeText?: string;
    type?: 'info' | 'warning' | 'error' | 'success' | 'confirm';
}

const ModalCustom = ({
    isModalVisible,
    setIsModalVisible,
    title,
    children,
    isAction = true,
    isClose = true,
    onPressAction,
    actionText = 'Xác nhận',
    closeText = 'Hủy',
    type = 'confirm'
}: ModalCustomProps) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isModalVisible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(scaleAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isModalVisible]);

    const getIconConfig = () => {
        switch (type) {
            case 'success':
                return { name: 'check-circle', color: theme.colors.success };
            case 'error':
                return { name: 'close-circle', color: theme.colors.error };
            case 'warning':
                return { name: 'alert-circle', color: theme.colors.warning };
            case 'confirm':
                return { name: 'help-circle', color: theme.colors.info };
            default:
                return { name: 'information', color: theme.colors.info };
        }
    };

    const iconConfig = getIconConfig();

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={() => setIsModalVisible(false)}
            statusBarTranslucent
        >
            <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => setIsModalVisible(false)}
                />
                <Animated.View
                    style={[
                        styles.modalContent,
                        { transform: [{ scale: scaleAnim }] }
                    ]}
                >
                    {/* Icon */}
                    {/* <View style={[styles.iconContainer, { backgroundColor: `${iconConfig.color}15` }]}>
                        <Icon name={iconConfig.name} size={ICON_SIZE.xl} color={iconConfig.color} />
                    </View> */}

                    {/* Title */}
                    <Text style={styles.modalTitle}>{title}</Text>

                    {/* Content */}
                    <View style={styles.modalBody}>
                        {children}
                    </View>

                    {/* Buttons */}
                    <View style={styles.modalFooter}>
                        {isClose && (
                            <TouchableOpacity
                                onPress={() => setIsModalVisible(false)}
                                style={styles.buttonClose}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.buttonCloseText}>{closeText}</Text>
                            </TouchableOpacity>
                        )}
                        {isAction && (
                            <TouchableOpacity
                                onPress={() => {
                                    if (onPressAction) {
                                        onPressAction();
                                    }
                                    setIsModalVisible(false);
                                }}
                                style={[styles.buttonAction, { backgroundColor: iconConfig.color }]}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.buttonActionText}>{actionText}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: wp('85%'),
        maxWidth: 400,
        backgroundColor: theme.colors.white,
        borderRadius: BORDER_RADIUS['2xl'],
        padding: SPACING.xl,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    modalTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    modalBody: {
        width: '100%',
        marginBottom: SPACING.lg,
    },
    modalFooter: {
        width: '100%',
        flexDirection: 'row',
        gap: SPACING.md,
    },
    buttonClose: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonCloseText: {
        color: theme.colors.text,
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
    },
    buttonAction: {
        flex: 1,
        paddingVertical: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonActionText: {
        color: theme.colors.white,
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
    },
});

export default ModalCustom;
