import { Platform } from 'react-native';

/**
 * Color System - AegisFlow AI
 * Brand color: #7a5af8 (Violet/Purple) - đồng bộ với frontend web
 * Ref: frontend/src/app/globals.css --color-brand-500
 */

// ─── LIGHT PALETTE ───────────────────────────────────────────────────────────
export const LIGHT_COLORS = {
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

  // Text Colors
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

  // Card & Surface
  card: '#FFFFFF',
  cardHover: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#FAFBFC',
  surfaceElevated: '#FFFFFF',

  // Base
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Gradients
  gradientPrimary: ['#7a5af8', '#9b8afb'] as string[],
  gradientSecondary: ['#F59E0B', '#D97706'] as string[],
  gradientDark: ['#0F172A', '#1E293B'] as string[],

  // iOS system grouped background
  systemGroupedBackground: '#F2F2F7',
  systemBackground: '#FFFFFF',
  secondarySystemGroupedBackground: '#FFFFFF',
  separator: 'rgba(60,60,67,0.29)',
};

// ─── DARK PALETTE ────────────────────────────────────────────────────────────
export const DARK_COLORS = {
  // Brand Colors (same — brand doesn't change)
  primary: '#9b8afb',
  primaryLight: '#c4b5fd',
  primaryDark: '#7a5af8',
  secondary: '#FBBF24',
  accent: '#F87171',

  // Background Colors (deep dark, layered)
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  backgroundTertiary: '#263148',
  backgroundDark: '#070D1A',

  // Text Colors (light on dark)
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textLight: '#475569',
  textWhite: '#FFFFFF',
  textDark: '#030712',

  // Status Colors (slightly brightened for dark bg)
  success: '#34D399',
  successLight: 'rgba(52,211,153,0.15)',
  error: '#F87171',
  errorLight: 'rgba(248,113,113,0.15)',
  warning: '#FBB040',
  warningLight: 'rgba(251,176,64,0.15)',
  info: '#9b8afb',
  infoLight: 'rgba(155,138,251,0.15)',

  // UI Elements
  border: '#1E293B',
  borderLight: '#263148',
  borderDark: '#334155',
  disabled: '#475569',
  disabledBackground: '#1E293B',

  // Card & Surface (elevated dark layers)
  card: '#1E293B',
  cardHover: '#263148',
  surface: '#1E293B',
  surfaceSecondary: '#263148',
  surfaceElevated: '#2D3F5A',

  // Base
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  // Gradients
  gradientPrimary: ['#7a5af8', '#9b8afb'] as string[],
  gradientSecondary: ['#FBBF24', '#F59E0B'] as string[],
  gradientDark: ['#0F172A', '#1E293B'] as string[],

  // iOS-style dark system backgrounds
  systemGroupedBackground: '#1C1C1E',
  systemBackground: '#000000',
  secondarySystemGroupedBackground: '#1C1C1E',
  separator: 'rgba(84,84,88,0.65)',
};

// Keep backward compat — COLORS = light
export const COLORS = LIGHT_COLORS;

// ─── SHARED THEME STRUCTURE ───────────────────────────────────────────────────
const sharedTheme = {
  spacing: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20,
    '2xl': 24, '3xl': 32, '4xl': 40, '5xl': 48,
  },
  borderRadius: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, full: 9999,
  },
  typography: {
    fontFamily: Platform.select({ ios: 'Inter', android: 'Roboto' }),
    fontSize: {
      '2xs': 10, xs: 12, sm: 14, md: 16, lg: 18, xl: 20,
      '2xl': 24, '3xl': 28, '4xl': 32, '5xl': 40, '6xl': 48,
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
    lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75, loose: 2 },
  },
  shadows: {
    none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    xs: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
    xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12 },
    primary: { shadowColor: '#7a5af8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  },
  animation: {
    duration: { instant: 100, fast: 200, normal: 300, slow: 500, slower: 700 },
  },
  layout: {
    containerPadding: 16,
    screenPadding: 20,
    maxWidth: 600,
    bottomTabHeight: 60,
    headerHeight: Platform.select({ ios: 44, android: 56 }),
    statusBarHeight: Platform.select({ ios: 20, android: 0 }),
  },
};

export const lightTheme = { ...sharedTheme, colors: LIGHT_COLORS };
export const darkTheme = { ...sharedTheme, colors: DARK_COLORS };

// Backward compat default export (light)
export const theme = lightTheme;