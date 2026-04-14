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
import { theme } from '../theme/colors';

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
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const inputRef = useRef<TextInput>(null);

  // 🔥 FIX: Animation khi value thay đổi (tự động điền)
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
    left: leftIcon ? 20 : theme.spacing.md,
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
      outputRange: [theme.colors.textLight, theme.colors.primary],
    }),
    backgroundColor: theme.colors.white,
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
              color={error ? theme.colors.error : theme.colors.textLight}
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
                color={error ? theme.colors.error : theme.colors.textLight}
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

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  required: {
    color: theme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'visible',
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.white,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputContainerError: {
    borderColor: theme.colors.error,
  },
  inputContainerDisabled: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
    height: 48,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.text,
    paddingTop: 12,
  },
  inputError: {
    color: theme.colors.error,
  },
  inputDisabled: {
    color: theme.colors.disabled,
  },
  leftIcon: {
    marginLeft: theme.spacing.md,
  },
  rightIcon: {
    marginRight: theme.spacing.md,
  },
  pressableInput: {
    flex: 1,
  },
  errorText: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.error,
  },
});

export default InputCustom;