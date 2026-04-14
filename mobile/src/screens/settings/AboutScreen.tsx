import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PageHeader from '../../component/PageHeader';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, ICON_SIZE, SCREEN_PADDING } from '../../theme';

const AboutScreen = () => {
    const navigation = useNavigation();

    const appInfo = {
        name: 'CityResQ360',
        version: '1.0.0',
        buildNumber: '100',
        description: 'Ứng dụng báo cáo và quản lý sự cố đô thị thông minh',
    };

    const features = [
        { icon: 'map-marker-alert', title: 'Báo cáo sự cố', description: 'Báo cáo các vấn đề đô thị nhanh chóng' },
        { icon: 'chart-line', title: 'Theo dõi tiến độ', description: 'Cập nhật tình trạng xử lý real-time' },
        { icon: 'account-group', title: 'Cộng đồng', description: 'Kết nối với cư dân thành phố' },
        { icon: 'shield-check', title: 'Xác thực', description: 'Hệ thống xác thực danh tính an toàn' },
    ];

    const teamMembers = [
        { name: 'Phát triển', email: 'dev@cityresq360.com' },
        { name: 'Hỗ trợ', email: 'support@cityresq360.com' },
        { name: 'Kinh doanh', email: 'business@cityresq360.com' },
    ];

    const socialLinks = [
        { icon: 'facebook', name: 'Facebook', url: 'https://facebook.com/cityresq360' },
        { icon: 'twitter', name: 'Twitter', url: 'https://twitter.com/cityresq360' },
        { icon: 'instagram', name: 'Instagram', url: 'https://instagram.com/cityresq360' },
        { icon: 'youtube', name: 'YouTube', url: 'https://youtube.com/@cityresq360' },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <PageHeader title="Về ứng dụng" variant="default" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* App Logo & Info */}
                <View style={styles.logoSection}>
                    <View style={styles.logoContainer}>
                        <Icon name="city-variant" size={64} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.appName}>{appInfo.name}</Text>
                    <Text style={styles.appVersion}>Phiên bản {appInfo.version} ({appInfo.buildNumber})</Text>
                    <Text style={styles.appDescription}>{appInfo.description}</Text>
                </View>

                {/* Features */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tính năng nổi bật</Text>
                    <View style={styles.featureGrid}>
                        {features.map((feature, index) => (
                            <View key={index} style={styles.featureCard}>
                                <View style={styles.featureIconContainer}>
                                    <Icon name={feature.icon} size={ICON_SIZE.lg} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.featureTitle}>{feature.title}</Text>
                                <Text style={styles.featureDescription}>{feature.description}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Mission */}
                <View style={styles.missionSection}>
                    <Icon name="target" size={ICON_SIZE.xl} color={theme.colors.primary} />
                    <Text style={styles.missionTitle}>Sứ mệnh của chúng tôi</Text>
                    <Text style={styles.missionText}>
                        Xây dựng một thành phố thông minh, kết nối cư dân với chính quyền để cùng nhau
                        giải quyết các vấn đề đô thị một cách nhanh chóng và hiệu quả.
                    </Text>
                </View>

                {/* Contact Team */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Liên hệ</Text>
                    <View style={styles.contactList}>
                        {teamMembers.map((member, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.contactItem}
                                onPress={() => Linking.openURL(`mailto:${member.email}`)}
                            >
                                <Icon name="email-outline" size={ICON_SIZE.md} color={theme.colors.primary} />
                                <View style={styles.contactInfo}>
                                    <Text style={styles.contactName}>{member.name}</Text>
                                    <Text style={styles.contactEmail}>{member.email}</Text>
                                </View>
                                <Icon name="chevron-right" size={ICON_SIZE.sm} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Social Media */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Theo dõi chúng tôi</Text>
                    <View style={styles.socialGrid}>
                        {socialLinks.map((social, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.socialButton}
                                onPress={() => Linking.openURL(social.url)}
                            >
                                <Icon name={social.icon} size={ICON_SIZE.lg} color={theme.colors.white} />
                                <Text style={styles.socialName}>{social.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Legal Links */}
                <View style={styles.legalSection}>
                    <TouchableOpacity
                        style={styles.legalLink}
                        onPress={() => Linking.openURL('https://cityresq360.com/privacy')}
                    >
                        <Text style={styles.legalText}>Chính sách bảo mật</Text>
                    </TouchableOpacity>
                    <Text style={styles.legalDivider}>•</Text>
                    <TouchableOpacity
                        style={styles.legalLink}
                        onPress={() => Linking.openURL('https://cityresq360.com/terms')}
                    >
                        <Text style={styles.legalText}>Điều khoản sử dụng</Text>
                    </TouchableOpacity>
                </View>

                {/* Copyright */}
                <Text style={styles.copyright}>
                    © 2025 CityResQ360. All rights reserved.
                </Text>
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
    logoSection: {
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        padding: SCREEN_PADDING.horizontal,
        paddingVertical: SPACING.xl * 2,
        marginBottom: SPACING.md,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    appName: {
        fontSize: FONT_SIZE['2xl'],
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: SPACING.xs,
    },
    appVersion: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
        marginBottom: SPACING.md,
    },
    appDescription: {
        fontSize: FONT_SIZE.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    section: {
        backgroundColor: theme.colors.white,
        padding: SCREEN_PADDING.horizontal,
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: SPACING.md,
    },
    featureGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    featureCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
    },
    featureIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    featureTitle: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
        textAlign: 'center',
    },
    featureDescription: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 16,
    },
    missionSection: {
        backgroundColor: theme.colors.primary + '10',
        padding: SCREEN_PADDING.horizontal,
        paddingVertical: SPACING.xl,
        marginHorizontal: SCREEN_PADDING.horizontal,
        borderRadius: BORDER_RADIUS.lg,
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    missionTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    missionText: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    contactList: {
        gap: SPACING.sm,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: BORDER_RADIUS.md,
        gap: SPACING.md,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    contactEmail: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.primary,
    },
    socialGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    socialButton: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: theme.colors.primary,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
        gap: SPACING.xs,
    },
    socialName: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: theme.colors.white,
    },
    legalSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
    },
    legalLink: {
        padding: SPACING.xs,
    },
    legalText: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    legalDivider: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
    },
    copyright: {
        fontSize: FONT_SIZE.xs,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingBottom: SPACING.xl,
    },
});

export default AboutScreen;
