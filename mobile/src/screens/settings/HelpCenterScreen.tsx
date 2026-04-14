import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PageHeader from '../../component/PageHeader';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, ICON_SIZE, SCREEN_PADDING } from '../../theme';

interface HelpItem {
    id: string;
    icon: string;
    title: string;
    description: string;
    action: () => void;
}

const HelpCenterScreen = () => {
    const navigation = useNavigation();

    const handleContactSupport = () => {
        Linking.openURL('mailto:support@cityresq360.com?subject=Hỗ trợ CityResQ360');
    };

    const handleOpenFAQ = () => {
        Linking.openURL('https://cityresq360.com/faq');
    };

    const handleOpenGuide = () => {
        Linking.openURL('https://cityresq360.com/guide');
    };

    const handleOpenCommunity = () => {
        Linking.openURL('https://community.cityresq360.com');
    };

    const handleReportBug = () => {
        Linking.openURL('mailto:bugs@cityresq360.com?subject=Báo lỗi CityResQ360');
    };

    const helpItems: HelpItem[] = [
        {
            id: 'faq',
            icon: 'frequently-asked-questions',
            title: 'Câu hỏi thường gặp',
            description: 'Tìm câu trả lời cho các câu hỏi phổ biến',
            action: handleOpenFAQ,
        },
        {
            id: 'guide',
            icon: 'book-open-variant',
            title: 'Hướng dẫn sử dụng',
            description: 'Tìm hiểu cách sử dụng các tính năng của ứng dụng',
            action: handleOpenGuide,
        },
        {
            id: 'contact',
            icon: 'email-outline',
            title: 'Liên hệ hỗ trợ',
            description: 'Gửi email cho đội ngũ hỗ trợ của chúng tôi',
            action: handleContactSupport,
        },
        {
            id: 'community',
            icon: 'account-group',
            title: 'Cộng đồng',
            description: 'Tham gia cộng đồng người dùng CityResQ360',
            action: handleOpenCommunity,
        },
        {
            id: 'bug',
            icon: 'bug-outline',
            title: 'Báo lỗi',
            description: 'Báo cáo lỗi hoặc vấn đề kỹ thuật',
            action: handleReportBug,
        },
    ];

    const quickLinks = [
        { title: 'Chính sách bảo mật', url: 'https://cityresq360.com/privacy' },
        { title: 'Điều khoản sử dụng', url: 'https://cityresq360.com/terms' },
        { title: 'Quy định cộng đồng', url: 'https://cityresq360.com/community-guidelines' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <PageHeader title="Trung tâm trợ giúp" variant="default" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <Icon name="help-circle" size={64} color={theme.colors.primary} />
                    <Text style={styles.headerTitle}>Chúng tôi có thể giúp gì cho bạn?</Text>
                    <Text style={styles.headerDescription}>
                        Tìm câu trả lời, hướng dẫn và hỗ trợ cho mọi thắc mắc của bạn
                    </Text>
                </View>

                {/* Help Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Danh mục hỗ trợ</Text>
                    <View style={styles.helpList}>
                        {helpItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.helpItem}
                                onPress={item.action}
                            >
                                <View style={styles.helpIconContainer}>
                                    <Icon name={item.icon} size={ICON_SIZE.lg} color={theme.colors.primary} />
                                </View>
                                <View style={styles.helpContent}>
                                    <Text style={styles.helpTitle}>{item.title}</Text>
                                    <Text style={styles.helpDescription}>{item.description}</Text>
                                </View>
                                <Icon name="chevron-right" size={ICON_SIZE.md} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Quick Links */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Liên kết nhanh</Text>
                    <View style={styles.linkList}>
                        {quickLinks.map((link, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.linkItem}
                                onPress={() => Linking.openURL(link.url)}
                            >
                                <Text style={styles.linkText}>{link.title}</Text>
                                <Icon name="open-in-new" size={ICON_SIZE.sm} color={theme.colors.primary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Contact Info */}
                <View style={styles.contactSection}>
                    <Text style={styles.contactTitle}>Liên hệ trực tiếp</Text>
                    <View style={styles.contactItem}>
                        <Icon name="email" size={ICON_SIZE.md} color={theme.colors.primary} />
                        <Text style={styles.contactText}>support@cityresq360.com</Text>
                    </View>
                    <View style={styles.contactItem}>
                        <Icon name="phone" size={ICON_SIZE.md} color={theme.colors.primary} />
                        <Text style={styles.contactText}>1900-xxxx (8:00 - 22:00)</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
    },
    headerSection: {
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        padding: SCREEN_PADDING.horizontal,
        paddingVertical: SPACING.xl,
        marginBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
    headerDescription: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    section: {
        backgroundColor: theme.colors.white,
        padding: SCREEN_PADDING.horizontal,
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: SPACING.md,
    },
    helpList: {
        gap: SPACING.sm,
    },
    helpItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: BORDER_RADIUS.md,
        gap: SPACING.md,
    },
    helpIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpContent: {
        flex: 1,
    },
    helpTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    helpDescription: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    linkList: {
        gap: SPACING.xs,
    },
    linkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: BORDER_RADIUS.sm,
    },
    linkText: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    contactSection: {
        backgroundColor: theme.colors.primary + '10',
        padding: SCREEN_PADDING.horizontal,
        marginHorizontal: SCREEN_PADDING.horizontal,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xl,
    },
    contactTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: SPACING.md,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    contactText: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.text,
    },
});

export default HelpCenterScreen;
