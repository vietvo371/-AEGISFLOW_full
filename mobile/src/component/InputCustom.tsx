import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Platform,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../contexts/ThemeContext';

interface InputCustomProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  error?: string;
  required?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  labelStyle?: TextStyle;
  subLabel?: string;
  onPress?: () => void;
  maxLength?: number;
}

const InputCustom: React.FC<InputCustomProps> = ({
  placeholder,
  value,
  onChangeText,
  containerStyle,
  inputStyle,
  error,
  required,
  leftIcon,
  rightIcon,
  onRightIconPress,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'none',
  editable = true,
  multiline = false,
  numberOfLines = 1,
  onPress,
  maxLength,
}) => {
  const { colors, isDark } = useAppTheme();
  const styles = getStyles(colors, isDark);
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const inputRef = useRef<TextInput>(null);

  // Animation khi value thay đổi (tự động điền)
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value || isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const labelStyle = {
    position: 'absolute',
    left: leftIcon ? 20 : 12,
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [14, -8],
    }),
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 12],
    }),
    color: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.textSecondary, colors.primary],
    }),
    backgroundColor: colors.card,
    paddingHorizontal: 4,
    zIndex: 1,
  } as any;

  const renderInput = () => (
    <TextInput
      ref={inputRef}
      style={[
        styles.input,
        inputStyle,
        error && styles.inputError,
        !editable && styles.inputDisabled,
        multiline && { height: numberOfLines * 24 },
      ]}
      value={value}
      onChangeText={onChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      editable={editable}
      multiline={multiline}
      numberOfLines={numberOfLines}
      maxLength={maxLength}
      placeholderTextColor={colors.textTertiary}
    />
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableWithoutFeedback
        onPress={() => {
          if (!onPress && editable) {
            inputRef.current?.focus();
          }
        }}
        disabled={!!onPress}
      >
        <View style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          !editable && styles.inputContainerDisabled,
        ]}>
          {leftIcon && (
            <Icon
              name={leftIcon}
              size={20}
              color={error ? colors.error : colors.textSecondary}
              style={styles.leftIcon}
            />
          )}

          <View style={styles.inputWrapper}>
            <Animated.Text style={labelStyle} pointerEvents="none">
              {placeholder}
              {required && <Text style={styles.required}> *</Text>}
            </Animated.Text>

            {onPress ? (
              <TouchableOpacity
                style={styles.pressableInput}
                onPress={onPress}
                activeOpacity={0.7}
              >
                {renderInput()}
              </TouchableOpacity>
            ) : (
              renderInput()
            )}
          </View>

          {rightIcon && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightIcon}
              disabled={!onRightIconPress}
            >
              <Icon
                name={rightIcon}
                size={20}
                color={error ? colors.error : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    width: '100%',
  },
  required: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12, // md BORDER_RADIUS is typically 12
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'visible',
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: isDark ? 0 : 2,
      },
    }),
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
    ...Platform.select({
      ios: {
        shadowOpacity: isDark ? 0 : 0.1,
      },
      android: {
        elevation: isDark ? 0 : 4,
      },
    }),
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  inputContainerDisabled: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
    paddingTop: 12,
  },
  inputError: {
    color: colors.error,
  },
  inputDisabled: {
    color: colors.textSecondary,
  },
  leftIcon: {
    marginLeft: 12,
  },
  rightIcon: {
    marginRight: 12,
  },
  pressableInput: {
    flex: 1,
  },
  errorText: {
    marginTop: 4,
    fontSize: 14,
    color: colors.error,
  },
});

export default InputCustom;