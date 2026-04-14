import { useTranslation as useI18nTranslation } from 'react-i18next';
import i18n from '../i18n';

export const useTranslation = () => {
  const { t, i18n: i18nInstance } = useI18nTranslation();

  const changeLanguage = async (languageCode: string) => {
    try {
      await i18nInstance.changeLanguage(languageCode);
    } catch (error) {
      console.log('Error changing language:', error);
    }
  };

  const getCurrentLanguage = () => {
    return i18nInstance.language;
  };

  const isRTL = () => {
    return i18nInstance.dir() === 'rtl';
  };

  return {
    t,
    changeLanguage,
    getCurrentLanguage,
    isRTL,
    currentLanguage: getCurrentLanguage(),
  };
};

export default useTranslation;
