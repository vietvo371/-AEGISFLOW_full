import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Platform } from 'react-native';

/**
 * Responsive System - Based on Fintech Best Practices
 * 
 * Using percentage-based measurements for true cross-device compatibility
 * Similar to: Binance, Coinbase, Revolut mobile apps
 */

export const responsive = {
  wp,
  hp,
};

// Font Sizes (responsive - works on all screen sizes)
export const FONT_SIZE = {
  '2xs': wp('2.5%'),   // ~10px on standard device
  xs: wp('3%'),        // ~12px
  sm: wp('3.5%'),      // ~14px
  md: wp('4%'),        // ~16px
  lg: wp('4.5%'),      // ~18px
  xl: wp('5%'),        // ~20px
  '2xl': wp('6%'),     // ~24px
  '3xl': wp('7%'),     // ~28px
  '4xl': wp('8%'),     // ~32px
  '5xl': wp('10%'),    // ~40px
  '6xl': wp('12%'),    // ~48px
};

// Spacing (responsive)
export const SPACING = {
  xs: wp('1%'),        // ~4px
  sm: wp('2%'),        // ~8px
  md: wp('3%'),        // ~12px
  lg: wp('4%'),        // ~16px
  xl: wp('5%'),        // ~20px
  '2xl': wp('6%'),     // ~24px
  '3xl': wp('8%'),     // ~32px
  '4xl': wp('10%'),    // ~40px
  '5xl': wp('12%'),    // ~48px
};

// Border Radius (responsive)
export const BORDER_RADIUS = {
  xs: wp('1%'),        // ~4px
  sm: wp('2%'),        // ~8px
  md: wp('3%'),        // ~12px
  lg: wp('4%'),        // ~16px
  xl: wp('5%'),        // ~20px
  '2xl': wp('6%'),     // ~24px
  full: 9999,          // Circular
};

// Icon Sizes (responsive)
export const ICON_SIZE = {
  xs: wp('4%'),        // ~16px
  sm: wp('5%'),        // ~20px
  md: wp('6%'),        // ~24px
  lg: wp('7%'),        // ~28px
  xl: wp('8%'),        // ~32px
  '2xl': wp('10%'),    // ~40px
};

// Button Heights (responsive)
export const BUTTON_HEIGHT = {
  sm: hp('4%'),        // ~32px
  md: hp('5.5%'),      // ~44px
  lg: hp('6.5%'),      // ~52px
  xl: hp('7.5%'),      // ~60px
};

// Input Heights (responsive)
export const INPUT_HEIGHT = {
  sm: hp('4.5%'),      // ~36px
  md: hp('5.5%'),      // ~44px
  lg: hp('6.5%'),      // ~52px
};

// Avatar Sizes (responsive)
export const AVATAR_SIZE = {
  xs: wp('8%'),        // ~32px
  sm: wp('10%'),       // ~40px
  md: wp('12%'),       // ~48px
  lg: wp('16%'),       // ~64px
  xl: wp('20%'),       // ~80px
  '2xl': wp('25%'),    // ~100px
};

// Card Dimensions (responsive)
export const CARD = {
  minHeight: hp('12%'),      // ~96px
  padding: wp('4%'),         // ~16px
  paddingSmall: wp('3%'),    // ~12px
  paddingLarge: wp('5%'),    // ~20px
};

// Tab Bar (responsive - platform aware)
export const TAB_BAR = {
  height: Platform.select({
    ios: hp('10%'),      // ~80px (taller for iPhone)
    android: hp('8%'),   // ~64px
  }),
  paddingBottom: Platform.select({
    ios: hp('2.5%'),     // ~20px (for home indicator)
    android: hp('1%'),   // ~8px
  }),
  iconSize: wp('6.5%'),  // ~26px
  fontSize: wp('3%'),    // ~12px
};

// Bottom Sheet Heights (responsive)
export const BOTTOM_SHEET = {
  small: hp('30%'),      // ~240px
  medium: hp('50%'),     // ~400px
  large: hp('80%'),      // ~640px
  full: hp('95%'),       // ~760px
};

// Screen Padding (responsive)
export const SCREEN_PADDING = {
  horizontal: wp('4%'),  // ~16px
  vertical: hp('2%'),    // ~16px
  small: wp('3%'),       // ~12px
  large: wp('5%'),       // ~20px
};

// List Item Heights (responsive)
export const LIST_ITEM = {
  small: hp('6%'),       // ~48px
  medium: hp('8%'),      // ~64px
  large: hp('10%'),      // ~80px
};

// Helper Functions
export const normalize = {
  // Font size normalizer (ensures readability)
  fontSize: (size: number) => {
    const scale = wp('100%') / 375; // Base on iPhone X width
    return Math.round(size * scale);
  },
  
  // Spacing normalizer
  spacing: (size: number) => {
    const scale = wp('100%') / 375;
    return Math.round(size * scale);
  },
  
  // Moderate scale for specific elements
  moderate: (size: number, factor = 0.5) => {
    const scale = wp('100%') / 375;
    return Math.round(size + (scale - 1) * factor);
  },
};

// Screen Breakpoints (for responsive layouts)
export const BREAKPOINTS = {
  small: wp('100%') < 360,    // Small phones
  medium: wp('100%') >= 360 && wp('100%') < 768,  // Standard phones
  large: wp('100%') >= 768,   // Tablets
};

export default {
  responsive,
  FONT_SIZE,
  SPACING,
  BORDER_RADIUS,
  ICON_SIZE,
  BUTTON_HEIGHT,
  INPUT_HEIGHT,
  AVATAR_SIZE,
  CARD,
  TAB_BAR,
  BOTTOM_SHEET,
  SCREEN_PADDING,
  LIST_ITEM,
  normalize,
  BREAKPOINTS,
}; 