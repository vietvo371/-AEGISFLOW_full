/**
 * Theme System - WISE English LMS
 * 
 * Centralized theme exports for cross-platform consistency
 * Usage:
 * import { theme, COLORS, textStyles, cardStyles, wp, hp } from '../../theme';
 */

export { theme, COLORS } from './colors';
export { typography, textStyles as typographyStyles, createTextStyle } from './typography';
export { 
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
} from './responsive';
export {
  containerStyles,
  cardStyles,
  buttonStyles,
  textStyles,
  inputStyles,
  badgeStyles,
  iconContainerStyles,
  listItemStyles,
  avatarStyles,
  dividerStyle,
} from './components';

// Re-export wp & hp for convenience
export { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

