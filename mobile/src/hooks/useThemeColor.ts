import { useColorScheme } from 'react-native';
import { theme as appTheme } from '../theme/colors';

export function useThemeColor(
  props: {
    light?: string;
    dark?: string;
  },
  colorName: keyof typeof appTheme.colors
) {
  const colorScheme = useColorScheme() ?? 'light';
  const colorFromProps = props[colorScheme];

  if (colorFromProps) {
    return colorFromProps;
  }
  return appTheme.colors[colorName];
}
