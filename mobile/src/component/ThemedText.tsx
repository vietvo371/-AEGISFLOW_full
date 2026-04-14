import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { textStyles } from '../theme/typography';

interface ThemedTextProps extends TextProps {
  variant?: keyof typeof textStyles;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = 'bodyMedium',
  style,
  color = '#1C1C1E',
  align,
  children,
  ...props
}) => {
  const baseStyle = textStyles[variant];
  const combinedStyle: TextStyle = {
    ...baseStyle,
    color,
    textAlign: align,
  };

  return (
    <Text style={[combinedStyle, style]} {...props}>
      {children}
    </Text>
  );
};