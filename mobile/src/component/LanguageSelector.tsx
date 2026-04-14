import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useTranslation } from '../hooks/useTranslation';

const { height } = Dimensions.get('window');

type Language = {
  code: string;
  name: string;
  flag: any;
};

const LANGUAGES: Language[] = [
  {
    code: 'vi',
    name: 'Tiếng Việt',
    flag: require('../assets/images/logo_vietnam.jpg'),
  },
  {
    code: 'en',
    name: 'English',
    flag: require('../assets/images/logo_eng.png'),
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
  currentLanguage: string;
};

const LanguageSelector = ({ visible, onClose, onSelect, currentLanguage }: Props) => {
  const { t, changeLanguage } = useTranslation();

  const handleLanguageSelect = async (languageCode: string) => {
    await changeLanguage(languageCode);
    onSelect(languageCode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('language.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={styles.languageItem}
              onPress={() => handleLanguageSelect(language.code)}
            >
              <View style={styles.languageInfo}>
                <Image 
                  source={language.flag}
                  style={styles.flag}
                />
                <Text style={styles.languageName}>{language.name}</Text>
              </View>
              {currentLanguage === language.code && (
                <Icon name="check" size={24} color="#4A90E2" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: hp('4%'),
    maxHeight: height * 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#000',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  languageName: {
    fontSize: wp('4%'),
    color: '#000',
  },
});

export default LanguageSelector;
