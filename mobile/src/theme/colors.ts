import { Platform } from 'react-native';

/**
 * Color System - AegisFlow AI
 * Brand color: #7a5af8 (Violet/Purple) - đồng bộ với frontend web
 * Ref: frontend/src/app/globals.css --color-brand-500
 */
export const COLORS = {
  // Brand Colors
  primary: '#7a5af8',
  primaryLight: '#9b8afb',
  primaryDark: '#6938ef',
  secondary: '#F59E0B',
  accent: '#EF4444',

  // Background Colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FB',
  backgroundTertiary: '#F0F2F5',
  backgroundDark: '#1A1D1F',

  // Text Colors (Fintech-optimized contrast)
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textLight: '#D1D5DB',
  textWhite: '#FFFFFF',
  textDark: '#030712',

  // Status Colors
  success: '#17b26a',
  successLight: '#D1FAE5',
  error: '#f04438',
  errorLight: '#FEE2E2',
  warning: '#f79009',
  warningLight: '#FEF3C7',
  info: '#7a5af8',
  infoLight: '#f4f3ff',

  // UI Elements
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  borderDark: '#d1d5db',
  disabled: '#9CA3AF',
  disabledBackground: '#F3F4F6',

  // Card & Surface (Fintech elevation)
  card: '#FFFFFF',
  cardHover: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#FAFBFC',
  surfaceElevated: '#FFFFFF',

  // Base Colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Gradients - đồng bộ brand violet
  gradientPrimary: ['#7a5af8', '#9b8afb'],
  gradientSecondary: ['#F59E0B', '#D97706'],
  gradientDark: ['#0F172A', '#1E293B'],
};

/**
 * Main Theme Object
 * Cross-platform design system for iOS & Android
 */
export const theme = {
  colors: COLORS,
  
  // Spacing System (consistent across platforms)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
  },
  
  // Border Radius
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
  },
  
  // Typography (platform-aware)
  typography: {
    fontFamily: Platform.select({
      ios: 'Inter',
      android: 'Roboto',
    }),
    fontSize: {
      '2xs': 10,
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 32,
      '5xl': 40,
      '6xl': 48,
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },
  
  // Shadows (platform-optimized)
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
    },
    xl: {
      shadowColor: COLORS.black,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 12,
    },
    primary: {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  
  // Animation
  animation: {
    duration: {
      instant: 100,
      fast: 200,
      normal: 300,
      slow: 500,
      slower: 700,
    },
  },
  
  // Layout Constants
  layout: {
    containerPadding: 16,
    screenPadding: 20,
    maxWidth: 600,
    bottomTabHeight: 60,
    headerHeight: Platform.select({ ios: 44, android: 56 }),
    statusBarHeight: Platform.select({ ios: 20, android: 0 }),
  },
}; 