import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PageHeader from '../../component/PageHeader';
import { SPACING, FONT_SIZE, BORDER_RADIUS, ICON_SIZE, SCREEN_PADDING } from '../../theme';
import { useAppTheme } from '../../contexts/ThemeContext';

interface HelpItem {
    id: string;
    icon: string;
    title: string;
    description: string;
    action: () => void;
}

const HelpCenterScreen = () => {
    const { t } = useTranslation();
    const { colors, isDark } = useAppTheme();
    const styles = getStyles(colors, isDark);

    const handleContactSupport = () => {
        Linking.openURL('mailto:support@aegisflow.ai?subject=Hỗ trợ AegisFlow AI');
    };

    const handleOpenFAQ = () => {
        Linking.openURL('https://aegisflow.ai/faq');
    };

    const handleOpenGuide = () => {
        Linking.openURL('https://aegisflow.ai/guide');
    };

    const handleOpenCommunity = () => {
        Linking.openURL('https://community.aegisflow.ai');
    };

    const handleReportBug = () => {
        Linking.openURL('mailto:bugs@aegisflow.ai?subject=Báo lỗi AegisFlow AI');
    };

    const helpItems: HelpItem[] = [
        {
            id: 'faq',
            icon: 'frequently-asked-questions',
            title: t('helpCenter.faqTitle', 'Câu hỏi thường gặp'),
            description: t('helpCenter.faqDesc', 'Tìm câu trả lời cho các câu hỏi phổ biến'),
            action: handleOpenFAQ,
        },
        {
            id: 'guide',
            icon: 'book-open-variant',
            title: t('helpCenter.guideTitle', 'Hướng dẫn sử dụng'),
            description: t('helpCenter.guideDesc', 'Tìm hiểu cách sử dụng các tính năng của ứng dụng'),
            action: handleOpenGuide,
        },
        {
            id: 'contact',
            icon: 'email-outline',
            title: t('helpCenter.contactTitle', 'Liên hệ hỗ trợ'),
            description: t('helpCenter.contactDesc', 'Gửi email cho đội ngũ hỗ trợ của chúng tôi'),
            action: handleContactSupport,
        },
        {
            id: 'community',
            icon: 'account-group',
            title: t('helpCenter.communityTitle', 'Cộng đồng'),
            description: t('helpCenter.communityDesc', 'Tham gia cộng đồng người dùng AegisFlow AI'),
            action: handleOpenCommunity,
        },
        {
            id: 'bug',
            icon: 'bug-outline',
            title: t('helpCenter.bugTitle', 'Báo lỗi'),
            description: t('helpCenter.bugDesc', 'Báo cáo lỗi hoặc vấn đề kỹ thuật'),
            action: handleReportBug,
        },
    ];

    const quickLinks = [
        { title: t('aboutScreen.privacyPolicy', 'Chính sách bảo mật'), url: 'https://aegisflow.ai/privacy' },
        { title: t('aboutScreen.termsOfUse', 'Điều khoản sử dụng'), url: 'https://aegisflow.ai/terms' },
        { title: t('helpCenter.communityGuidelines', 'Quy định cộng đồng'), url: 'https://aegisflow.ai/community-guidelines' },
    ];

    return (
        <View style={styles.container}>
            <PageHeader title={t('citizen.profile.helpCenter', 'Trung tâm trợ giúp')} variant="default" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <Icon name="help-circle" size={64} color={colors.primary} />
                    <Text style={styles.headerTitle}>{t('helpCenter.headerTitle', 'Chúng tôi có thể giúp gì cho bạn?')}</Text>
                    <Text style={styles.headerDescription}>
                        {t('helpCenter.headerDescription', 'Tìm câu trả lời, hướng dẫn và hỗ trợ cho mọi thắc mắc của bạn')}
                    </Text>
                </View>

                {/* Help Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('helpCenter.categoriesTitle', 'Danh mục hỗ trợ')}</Text>
                    <View style={styles.helpList}>
                        {helpItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.helpItem}
                                onPress={item.action}
                            >
                                <View style={styles.helpIconContainer}>
                                    <Icon name={item.icon} size={ICON_SIZE.lg} color={colors.primary} />
                                </View>
                                <View style={styles.helpContent}>
                                    <Text style={styles.helpTitle}>{item.title}</Text>
                                    <Text style={styles.helpDescription}>{item.description}</Text>
                                </View>
                                <Icon name="chevron-right" size={ICON_SIZE.md} color={colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Quick Links */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('helpCenter.quickLinksTitle', 'Liên kết nhanh')}</Text>
                    <View style={styles.linkList}>
                        {quickLinks.map((link, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.linkItem}
                                onPress={() => Linking.openURL(link.url)}
                            >
                                <Text style={styles.linkText}>{link.title}</Text>
                                <Icon name="open-in-new" size={ICON_SIZE.sm} color={colors.primary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Contact Info */}
                <View style={styles.contactSection}>
                    <Text style={styles.contactTitle}>{t('helpCenter.directContactTitle', 'Liên hệ trực tiếp')}</Text>
                    <View style={styles.contactItem}>
                        <Icon name="email" size={ICON_SIZE.md} color={colors.primary} />
                        <Text style={styles.contactText}>support@aegisflow.ai</Text>
                    </View>
                    <View style={styles.contactItem}>
                        <Icon name="phone" size={ICON_SIZE.md} color={colors.primary} />
                        <Text style={styles.contactText}>{t('helpCenter.phoneHours', '1900-xxxx (8:00 - 22:00)')}</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    content: {
        flex: 1,
    },
    headerSection: {
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: SCREEN_PADDING.horizontal,
        paddingVertical: SPACING.xl,
        marginBottom: SPACING.md,
        borderBottomWidth: 1,
        borderColor: colors.borderLight,
    },
    headerTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: colors.text,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    headerDescription: {
        fontSize: FONT_SIZE.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    section: {
        backgroundColor: colors.card,
        padding: SCREEN_PADDING.horizontal,
        marginBottom: SPACING.md,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: SPACING.md,
    },
    helpList: {
        gap: SPACING.sm,
    },
    helpItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: colors.background,
        borderRadius: BORDER_RADIUS.md,
        gap: SPACING.md,
    },
    helpIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpContent: {
        flex: 1,
    },
    helpTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    helpDescription: {
        fontSize: FONT_SIZE.sm,
        color: colors.textSecondary,
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
        backgroundColor: colors.background,
        borderRadius: BORDER_RADIUS.sm,
    },
    linkText: {
        fontSize: FONT_SIZE.sm,
        color: colors.primary,
        fontWeight: '500',
    },
    contactSection: {
        backgroundColor: colors.primary + '10',
        padding: SCREEN_PADDING.horizontal,
        marginHorizontal: SCREEN_PADDING.horizontal,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xl,
    },
    contactTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: colors.text,
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
        color: colors.text,
    },
});

export default HelpCenterScreen;
