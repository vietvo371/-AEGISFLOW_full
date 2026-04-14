import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

interface CustomIconProps {
  name: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

const CustomIcon: React.FC<CustomIconProps> = ({ name, size = 24, style }) => {
  const iconMap: Record<string, any> = {
    'stats/book-education': require('../assets/icons/flaticon/stats/book-education.png'),
    'stats/check-circle': require('../assets/icons/flaticon/stats/check-circle.png'),
    'stats/clock': require('../assets/icons/flaticon/stats/clock.png'),
    'notification/bell': require('../assets/icons/flaticon/notification/bell.png'),
    'status/refresh': require('../assets/icons/flaticon/status/refresh.png'),
    'status/check-badge': require('../assets/icons/flaticon/status/check-badge.png'),
    'status/progress': require('../assets/icons/flaticon/status/progress.png'),
    'status/pause': require('../assets/icons/flaticon/status/pause.png'),
    'status/alert': require('../assets/icons/flaticon/status/alert.png'),
    'course/teacher': require('../assets/icons/flaticon/course/teacher.png'),
    'course/calendar': require('../assets/icons/flaticon/course/calendar.png'),
    'course/book-open': require('../assets/icons/flaticon/course/book-open.png'),
  };

  const source = iconMap[name];

  if (!source) {
    console.warn(`Icon not found: ${name}`);
    return null;
  }

  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
};

export default CustomIcon;

