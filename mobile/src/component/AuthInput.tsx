import React, { useState } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  View, 
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from './ThemedText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming 
} from 'react-native-reanimated';
import { theme } from '../theme/colors';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: string;
  isPassword?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function AuthInput({ 
  label, 
  error, 
  icon,
  isPassword,
  value,
  onChangeText,
  ...props 
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          scale: withSpring(isFocused ? 1.02 : 1)
        }
      ]
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          translateY: withSpring(isFocused || value ? -25 : 0)
        },
        {
          scale: withSpring(isFocused || value ? 0.85 : 1)
        }
      ],
      color: error 
        ? theme.colors.error
        : isFocused 
          ? theme.colors.primary 
          : theme.colors.text,
    };
  });

  const errorStyle = useAnimatedStyle(() => {
    if (!error) return { height: 0, opacity: 0 };
    return {
      height: withTiming(20),
      opacity: withTiming(1),
    };
  });

  return (
    <AnimatedView style={[styles.container, containerStyle]}>
      <View style={[
        styles.inputContainer,
        error && styles.inputError,
        isFocused && styles.inputFocused,
      ]}>
        {icon && (
          <Icon 
            name={icon} 
            size={24} 
            color={error ? theme.colors.error : theme.colors.text} 
            style={styles.icon}
          />
        )}
        <View style={styles.inputWrapper}>
          <Animated.Text style={[styles.label, labelStyle]}>
            {label}
          </Animated.Text>
          <TextInput
            style={styles.input}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={isPassword && !showPassword}
            placeholderTextColor={theme.colors.textLight}
            {...props}
          />
        </View>
        {isPassword && (
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
          >
            <Icon 
              name={showPassword ? 'eye-off' : 'eye'} 
              size={24} 
              color={theme.colors.text} 
            />
          </TouchableOpacity>
        )}
      </View>
      <Animated.View style={[styles.errorContainer, errorStyle]}>
        {error && (
          <ThemedText style={styles.errorText}>
            {error}
          </ThemedText>
        )}
      </Animated.View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    minHeight: 56,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
  },
  icon: {
    marginLeft: 16,
  },
  inputWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  label: {
    position: 'absolute',
    left: 0,
    top: 18,
    fontSize: 16,
    color: theme.colors.text,
  },
  input: {
    fontSize: 16,
    color: theme.colors.text,
    paddingTop: 24,
    paddingBottom: 8,
  },
  passwordToggle: {
    padding: 16,
  },
  errorContainer: {
    marginTop: 4,
    overflow: 'hidden',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
  },
});
