import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PageHeader from '../../component/PageHeader';
import { theme, SPACING, FONT_SIZE, BORDER_RADIUS, ICON_SIZE, SCREEN_PADDING } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

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
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

const LanguageSettingsScreen = () => {
    const navigation = useNavigation();
    const { t, i18n } = useTranslation();
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
                                    <Icon name="check-circle" size={ICON_SIZE.md} color={theme.colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.noteSection}>
                    <Icon name="information-outline" size={ICON_SIZE.md} color={theme.colors.info} />
                    <Text style={styles.noteText}>
                        {t('language.incompleteTranslationNote', 'Một số nội dung có thể chưa được dịch hoàn toàn. Chúng tôi đang nỗ lực cải thiện.')}
                    </Text>
                </View>
            </ScrollView>
        </View>
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
    section: {
        backgroundColor: theme.colors.white,
        padding: SCREEN_PADDING.horizontal,
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: SPACING.xs,
    },
    sectionDescription: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    languageItemSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
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
        color: theme.colors.text,
    },
    languageSubname: {
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
    },
    noteSection: {
        flexDirection: 'row',
        gap: SPACING.sm,
        backgroundColor: theme.colors.info + '10',
        padding: SPACING.md,
        marginHorizontal: SCREEN_PADDING.horizontal,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.xl,
    },
    noteText: {
        flex: 1,
        fontSize: FONT_SIZE.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
});

export default LanguageSettingsScreen;
