import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  ViewStyle,
  TextInput,
  Image,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/colors';
import { SvgUri } from 'react-native-svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SelectOption {
  label: string;
  value: string;
  subtitle?: string;
  iconUrl?: string | number;
  searchText?: string;
}

interface SelectCustomProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  containerStyle?: ViewStyle;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
}

const SelectCustom: React.FC<SelectCustomProps> = ({
  value,
  onChange,
  options,
  label,
  error,
  required = false,
  placeholder = 'Chọn một tùy chọn',
  containerStyle,
  searchable = false,
  searchPlaceholder = 'Tìm kiếm...',
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));

  const selectedOption = options.find(option => option.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return options;
    }
    const q = searchQuery.toLowerCase();
    return options.filter(option => {
      const haystack = [
        option.label,
        option.subtitle || '',
        option.value || '',
        option.searchText || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [options, searchQuery, searchable]);

  const handleSelect = (option: SelectOption) => {
    onChange(option.value);
    handleModalClose();
  };

  const handleModalOpen = () => {
    if (disabled) return;
    setModalVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 8,
    }).start();
  };

  const handleModalClose = () => {
     // Close quickly with a short timing animation
     Animated.timing(slideAnim, {
       toValue: SCREEN_HEIGHT,
       duration: 150,
       easing: Easing.out(Easing.quad),
       useNativeDriver: true,
     }).start(() => {
       setModalVisible(false);
       setSearchQuery('');
     });
  };

  const renderIcon = (iconUrl: string | number | undefined, size: number = 28, style?: any) => {
    if (!iconUrl) {
      return (
        <View style={[styles.iconFallback, { width: size, height: size }, style]}>
          <Icon name="bank" size={size * 0.6} color={theme.colors.primary} />
        </View>
      );
    }

    // Handle local assets (require() returns number)
    if (typeof iconUrl === 'number') {
      return (
        <Image 
          source={iconUrl} 
          style={[{ width: size, height: size, borderRadius: 6 }, style]} 
          resizeMode="contain" 
        />
      );
    }

    // Handle SVG URLs
    if (iconUrl.toLowerCase().endsWith('.svg')) {
      return <SvgUri uri={iconUrl} width={size} height={size} style={style} />;
    }

    // Handle regular image URLs
    return (
      <Image 
        source={{ uri: iconUrl }} 
        style={[{ width: size, height: size, borderRadius: 6 }, style]} 
        resizeMode="contain" 
      />
    );
  };

  const renderOption = ({ item, index }: { item: SelectOption; index: number }) => {
    const isSelected = item.value === value;
    
    return (
      <Animated.View
        style={{
          opacity: 1,
          transform: [{
            translateY: new Animated.Value(0)
          }]
        }}
      >
        <TouchableOpacity
          style={[
            styles.option,
            isSelected && styles.selectedOption,
            index === 0 && styles.firstOption,
            index === filteredOptions.length - 1 && styles.lastOption,
          ]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <View style={styles.optionContent}>
            {renderIcon(item.iconUrl, 32, styles.optionIcon)}
            <View style={styles.optionTextContainer}>
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.selectedOptionText,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {!!item.subtitle && (
                <Text style={styles.optionSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              )}
            </View>
          </View>
          {isSelected && (
            <View style={styles.checkContainer}>
              <Icon name="check-circle" size={22} color={theme.colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.button,
          error && styles.buttonError,
          disabled && styles.buttonDisabled,
          selectedOption && styles.buttonSelected,
        ]}
        onPress={handleModalOpen}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <View style={styles.buttonContent}>
          {renderIcon(selectedOption?.iconUrl, 24, styles.buttonIcon)}
          <View style={styles.buttonTextContainer}>
            <Text
              style={[
                styles.buttonText,
                !selectedOption && styles.placeholderText,
                disabled && styles.disabledText,
              ]}
              numberOfLines={1}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </Text>
            {!!selectedOption?.subtitle && (
              <Text style={[styles.buttonSubtitle, disabled && styles.disabledText]} numberOfLines={1}>
                {selectedOption.subtitle}
              </Text>
            )}
          </View>
        </View>
        <Icon 
          name="chevron-down" 
          size={20} 
          color={disabled ? theme.colors.textLight : theme.colors.primary} 
          style={[styles.chevron, modalVisible && styles.chevronRotated]}
        />
      </TouchableOpacity>
      
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={14} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleModalClose}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={handleModalClose}
          />
          
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.grabber} />
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{label || 'Select'}</Text>
                <TouchableOpacity
                  onPress={handleModalClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="close" size={24} color={theme.colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>
            
            {searchable && (
              <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                  <Icon name="magnify" size={20} color={theme.colors.textLight} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={theme.colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      style={styles.clearButton}
                      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                    >
                      <Icon name="close-circle" size={18} color={theme.colors.textLight} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            
            <FlatList
              data={filteredOptions}
              renderItem={renderOption}
              keyExtractor={item => item.value}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                searchQuery ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                      <Icon name="magnify" size={48} color={theme.colors.textLight} />
                    </View>
                    <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                    <Text style={styles.emptySubtext}>
                      Thử tìm kiếm với từ khóa khác
                    </Text>
                  </View>
                ) : null
              }
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.3,
  },
  required: {
    color: theme.colors.error,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '05',
  },
  buttonError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '05',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buttonIcon: {
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.md,
    fontWeight: '500',
    color: theme.colors.text,
    lineHeight: 20,
  },
  buttonSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textLight,
    marginTop: 2,
    lineHeight: 16,
  },
  placeholderText: {
    color: theme.colors.textLight,
    fontWeight: '400',
  },
  disabledText: {
    color: theme.colors.textLight,
  },
  chevron: {
    marginLeft: theme.spacing.sm,
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    height: SCREEN_HEIGHT * 0.65,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    alignItems: 'center',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  searchSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '30',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    height: '100%',
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginVertical: 2,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.white,
  },
  firstOption: {
    marginTop: theme.spacing.md,
  },
  lastOption: {
    marginBottom: theme.spacing.sm,
  },
  selectedOption: {
    backgroundColor: theme.colors.primary + '08',
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.md,
    fontWeight: '500',
    color: theme.colors.text,
    lineHeight: 20,
  },
  optionSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textLight,
    marginTop: 2,
    lineHeight: 16,
  },
  selectedOptionText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  checkContainer: {
    marginLeft: theme.spacing.md,
  },
  iconFallback: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SelectCustom;
