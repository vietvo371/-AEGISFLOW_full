import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PageHeader from '../../component/PageHeader';
import { SPACING, FONT_SIZE, BORDER_RADIUS, ICON_SIZE, SCREEN_PADDING } from '../../theme';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../contexts/ThemeContext';

const AboutScreen = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const { colors, isDark } = useAppTheme();
    const styles = getStyles(colors, isDark);

    const appInfo = {
        name: 'AegisFlow AI',
        version: '1.0.0',
        buildNumber: '100',
        description: t('aboutScreen.description', 'Smart urban incident reporting and management application'),
    };

    const features = [
        { icon: 'map-marker-alert', title: t('aboutScreen.features.report.title', 'Incident Reporting'), description: t('aboutScreen.features.report.description', 'Report urban problems quickly') },
        { icon: 'chart-line', title: t('aboutScreen.features.tracking.title', 'Progress Tracking'), description: t('aboutScreen.features.tracking.description', 'Update real-time processing status') },
        { icon: 'account-group', title: t('aboutScreen.features.community.title', 'Community'), description: t('aboutScreen.features.community.description', 'Connect with city residents') },
        { icon: 'shield-check', title: t('aboutScreen.features.auth.title', 'Authentication'), description: t('aboutScreen.features.auth.description', 'Secure identity verification system') },
    ];

    const teamMembers = [
        { name: t('aboutScreen.contactRoles.dev', 'Development'), email: 'dev@aegisflow.ai' },
        { name: t('aboutScreen.contactRoles.support', 'Support'), email: 'support@aegisflow.ai' },
        { name: t('aboutScreen.contactRoles.business', 'Business'), email: 'business@aegisflow.ai' },
    ];

    const socialLinks = [
        { icon: 'facebook', name: 'Facebook', url: 'https://facebook.com/aegisflowai' },
        { icon: 'twitter', name: 'Twitter', url: 'https://twitter.com/aegisflowai' },
        { icon: 'instagram', name: 'Instagram', url: 'https://instagram.com/aegisflowai' },
        { icon: 'youtube', name: 'YouTube', url: 'https://youtube.com/@aegisflowai' },
    ];

    return (
        <View style={styles.container}>
            <PageHeader title={t('aboutScreen.title', 'About Application')} variant="default" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* App Logo & Info */}
                <View style={styles.logoSection}>
                    <View style={styles.logoContainer}>
                        <Icon name="city-variant" size={64} color={colors.primary} />
                    </View>
                    <Text style={styles.appName}>{appInfo.name}</Text>
                    <Text style={styles.appVersion}>{t('aboutScreen.version', `Version ${appInfo.version} (${appInfo.buildNumber})`, { version: appInfo.version, build: appInfo.buildNumber })}</Text>
                    <Text style={styles.appDescription}>{appInfo.description}</Text>
                </View>

                {/* Features */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('aboutScreen.highlightedFeatures', 'Highlighted Features')}</Text>
                    <View style={styles.featureGrid}>
                        {features.map((feature, index) => (
                            <View key={index} style={styles.featureCard}>
                                <View style={styles.featureIconContainer}>
                                    <Icon name={feature.icon} size={ICON_SIZE.lg} color={colors.primary} />
                                </View>
                                <Text style={styles.featureTitle}>{feature.title}</Text>
                                <Text style={styles.featureDescription}>{feature.description}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Mission */}
                <View style={styles.missionSection}>
                    <Icon name="target" size={ICON_SIZE.xl} color={colors.primary} />
                    <Text style={styles.missionTitle}>{t('aboutScreen.ourMission', 'Our Mission')}</Text>
                    <Text style={styles.missionText}>
                        {t('aboutScreen.missionText', 'Building a smart city, connecting residents with authorities to solve urban issues together quickly and effectively.')}
                    </Text>
                </View>

                {/* Contact Team */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('aboutScreen.contact', 'Contact')}</Text>
                    <View style={styles.contactList}>
                        {teamMembers.map((member, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.contactItem}
                                onPress={() => Linking.openURL(`mailto:${member.email}`)}
                            >
                                <Icon name="email-outline" size={ICON_SIZE.md} color={colors.primary} />
                                <View style={styles.contactInfo}>
                                    <Text style={styles.contactName}>{member.name}</Text>
                                    <Text style={styles.contactEmail}>{member.email}</Text>
                                </View>
                                <Icon name="chevron-right" size={ICON_SIZE.sm} color={colors.textSecondary} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Social Media */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('aboutScreen.followUs', 'Follow Us')}</Text>
                    <View style={styles.socialGrid}>
                        {socialLinks.map((social, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.socialButton}
                                onPress={() => Linking.openURL(social.url)}
                            >
                                <Icon name={social.icon} size={ICON_SIZE.lg} color="#FFFFFF" />
                                <Text style={styles.socialName}>{social.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Legal Links */}
                <View style={styles.legalSection}>
                    <TouchableOpacity
                        style={styles.legalLink}
                        onPress={() => Linking.openURL('https://aegisflow.ai/privacy')}
                    >
                        <Text style={styles.legalText}>{t('aboutScreen.privacyPolicy', 'Privacy Policy')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.legalDivider}>•</Text>
                    <TouchableOpacity
                        style={styles.legalLink}
                        onPress={() => Linking.openURL('https://aegisflow.ai/terms')}
                    >
                        <Text style={styles.legalText}>{t('aboutScreen.termsOfUse', 'Terms of Use')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Copyright */}
                <Text style={styles.copyright}>
                    © 2025 AegisFlow AI. All rights reserved.
                </Text>
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
    logoSection: {
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: SCREEN_PADDING.horizontal,
        paddingVertical: SPACING.xl * 2,
        marginBottom: SPACING.md,
        borderBottomWidth: 1,
        borderColor: colors.borderLight,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    appName: {
        fontSize: FONT_SIZE['2xl'],
        fontWeight: '700',
        color: colors.text,
        marginBottom: SPACING.xs,
    },
    appVersion: {
        fontSize: FONT_SIZE.sm,
        color: colors.textSecondary,
        marginBottom: SPACING.md,
    },
    appDescription: {
        fontSize: FONT_SIZE.md,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    section: {
        backgroundColor: colors.card,
        padding: SCREEN_PADDING.horizontal,
        marginBottom: SPACING.md,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: colors.text,
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
        backgroundColor: colors.background,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.borderLight,
    },
    featureIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    featureTitle: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
        textAlign: 'center',
    },
    featureDescription: {
        fontSize: FONT_SIZE.xs,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 16,
    },
    missionSection: {
        backgroundColor: colors.primary + '10',
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
        color: colors.text,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    missionText: {
        fontSize: FONT_SIZE.sm,
        color: colors.textSecondary,
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
        backgroundColor: colors.background,
        borderRadius: BORDER_RADIUS.md,
        gap: SPACING.md,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    contactEmail: {
        fontSize: FONT_SIZE.sm,
        color: colors.primary,
    },
    socialGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    socialButton: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.primary,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
        gap: SPACING.xs,
    },
    socialName: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: '#FFFFFF',
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
        color: colors.primary,
        fontWeight: '500',
    },
    legalDivider: {
        fontSize: FONT_SIZE.sm,
        color: colors.textSecondary,
    },
    copyright: {
        fontSize: FONT_SIZE.xs,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingBottom: SPACING.xl,
    },
});

export default AboutScreen;
