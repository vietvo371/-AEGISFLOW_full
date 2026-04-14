import { Platform } from 'react-native';

export const typography = {
  fontFamily: Platform.select({
    ios: 'SF Pro Display',
    android: 'Roboto',
  }),
  fontWeights: {
    regular: Platform.select({
      ios: '400',
      android: 'normal',
    }),
    medium: Platform.select({
      ios: '500',
      android: '500',
    }),
    semiBold: Platform.select({
      ios: '600',
      android: '600',
    }),
    bold: Platform.select({
      ios: '700',
      android: 'bold',
    }),
  },
  sizes: {
    '2xs': 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 64,
  },
  lineHeights: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: -0.8,
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    wider: 0.8,
    widest: 1.6,
  },
};

export const createTextStyle = (
  size: keyof typeof typography.sizes,
  weight: keyof typeof typography.fontWeights = 'regular',
  lineHeight: keyof typeof typography.lineHeights = 'normal',
) => ({
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes[size],
  fontWeight: typography.fontWeights[weight],
  lineHeight: typography.sizes[size] * typography.lineHeights[lineHeight],
});

// Common text styles
export const textStyles = {
  // Headers
  h1: {
    ...createTextStyle('6xl', 'bold', 'tight'),
    letterSpacing: typography.letterSpacing.tight,
  },
  h2: {
    ...createTextStyle('5xl', 'bold', 'tight'),
    letterSpacing: typography.letterSpacing.tight,
  },
  h3: {
    ...createTextStyle('4xl', 'bold', 'snug'),
    letterSpacing: typography.letterSpacing.tight,
  },
  h4: {
    ...createTextStyle('3xl', 'semiBold', 'snug'),
    letterSpacing: typography.letterSpacing.tight,
  },
  h5: {
    ...createTextStyle('2xl', 'semiBold', 'snug'),
    letterSpacing: typography.letterSpacing.tight,
  },
  h6: {
    ...createTextStyle('xl', 'semiBold', 'normal'),
    letterSpacing: typography.letterSpacing.tight,
  },

  // Body text
  bodyLarge: {
    ...createTextStyle('lg', 'regular', 'relaxed'),
    letterSpacing: typography.letterSpacing.normal,
  },
  bodyMedium: {
    ...createTextStyle('md', 'regular', 'relaxed'),
    letterSpacing: typography.letterSpacing.normal,
  },
  bodySmall: {
    ...createTextStyle('sm', 'regular', 'relaxed'),
    letterSpacing: typography.letterSpacing.normal,
  },

  // Labels
  labelLarge: {
    ...createTextStyle('lg', 'medium', 'normal'),
    letterSpacing: typography.letterSpacing.wide,
  },
  labelMedium: {
    ...createTextStyle('md', 'medium', 'normal'),
    letterSpacing: typography.letterSpacing.wide,
  },
  labelSmall: {
    ...createTextStyle('sm', 'medium', 'normal'),
    letterSpacing: typography.letterSpacing.wide,
  },

  // Special cases
  button: {
    ...createTextStyle('md', 'semiBold', 'normal'),
    letterSpacing: typography.letterSpacing.wide,
  },
  caption: {
    ...createTextStyle('sm', 'regular', 'normal'),
    letterSpacing: typography.letterSpacing.normal,
  },
  overline: {
    ...createTextStyle('xs', 'medium', 'normal'),
    letterSpacing: typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },

  // Numbers
  numbers: {
    ...createTextStyle('2xl', 'bold', 'none'),
    letterSpacing: typography.letterSpacing.tight,
    fontFeatureSettings: "'tnum' on, 'lnum' on",
  },
  smallNumbers: {
    ...createTextStyle('md', 'medium', 'none'),
    letterSpacing: typography.letterSpacing.tight,
    fontFeatureSettings: "'tnum' on, 'lnum' on",
  },
};