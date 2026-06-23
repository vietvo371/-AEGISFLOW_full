import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PageHeader from '../../component/PageHeader';
import { SPACING, FONT_SIZE, BORDER_RADIUS, ICON_SIZE, SCREEN_PADDING } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../contexts/ThemeContext';

const LANGUAGE_KEY = '@app_language';

interface Language {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
}

const LANGUAGES: Language[] = [
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
    { code: 'tl', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭' },
];

const LanguageSettingsScreen = () => {
    const navigation = useNavigation();
    const { t, i18n } = useTranslation();
    const { colors, isDark } = useAppTheme();
    const styles = getStyles(colors, isDark);
    const [selectedLanguage, setSelectedLanguage] = useState('vi');

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
            if (saved) {
                setSelectedLanguage(saved);
            }
        } catch (error) {
            console.error('Error loading language:', error);
        }
    };

    const handleSelectLanguage = async (code: string) => {
        try {
            await AsyncStorage.setItem(LANGUAGE_KEY, code);
            setSelectedLanguage(code);
            i18n.changeLanguage(code);
        } catch (error) {
            console.error('Error saving language:', error);
        }
    };

    return (
        <View style={styles.container}>
            <PageHeader title={t('language.title', 'Ngôn ngữ')} variant="default" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('language.selectLanguage', 'Chọn ngôn ngữ hiển thị')}</Text>
                    <Text style={styles.sectionDescription}>
                        {t('language.changeLanguageDesc', 'Thay đổi ngôn ngữ hiển thị của ứng dụng')}
                    </Text>

                    <View style={styles.languageList}>
                        {LANGUAGES.map((language) => (
                            <TouchableOpacity
                                key={language.code}
                                style={[
                                    styles.languageItem,
                                    selectedLanguage === language.code && styles.languageItemSelected
                                ]}
                                onPress={() => handleSelectLanguage(language.code)}
                            >
                                <View style={styles.languageInfo}>
                                    <Text style={styles.flag}>{language.flag}</Text>
                                    <View style={styles.languageText}>
                                        <Text style={styles.languageName}>{language.nativeName}</Text>
                                        <Text style={styles.languageSubname}>{language.name}</Text>
                                    </View>
                                </View>
                                {selectedLanguage === language.code && (
                                    <Icon name="check-circle" size={ICON_SIZE.md} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.noteSection}>
                    <Icon name="information-outline" size={ICON_SIZE.md} color={colors.info} />
                    <Text style={styles.noteText}>
                        {t('language.incompleteTranslationNote', 'Một số nội dung có thể chưa được dịch hoàn toàn. Chúng tôi đang nỗ lực cải thiện.')}
                    </Text>
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
    section: {
        backgroundColor: colors.card,
        padding: SCREEN_PADDING.horizontal,
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: colors.text,
        marginBottom: SPACING.xs,
    },
    sectionDescription: {
        fontSize: FONT_SIZE.sm,
        color: colors.textSecondary,
        marginBottom: SPACING.lg,
    },
    languageList: {
        gap: SPACING.sm,
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        backgroundColor: colors.background,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    languageItemSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    languageInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    flag: {
        fontSize: 32,
    },
    languageText: {
        gap: 2,
    },
    languageName: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: colors.text,
    },
    languageSubname: {
        fontSize: FONT_SIZE.sm,
        color: colors.textSecondary,
    },
    noteSection: {
        flexDirection: 'row',
        gap: SPACING.sm,
        backgroundColor: colors.infoLight,
        padding: SPACING.md,
        marginHorizontal: SCREEN_PADDING.horizontal,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xl,
    },
    noteText: {
        flex: 1,
        fontSize: FONT_SIZE.sm,
        color: colors.textSecondary,
        lineHeight: 20,
    },
});
export default LanguageSettingsScreen;
