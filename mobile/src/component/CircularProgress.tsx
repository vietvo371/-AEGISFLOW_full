import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);
import { theme } from '../theme/colors';

interface CircularProgressProps {
  size: number;
  width: number;
  fill: number;
  tintColor?: string;
  backgroundColor?: string;
  rotation?: number;
  children?: React.ReactNode;
  style?: any;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  size,
  width,
  fill,
  tintColor = theme.colors.primary,
  backgroundColor = theme.colors.border,
  rotation = 0,
  children,
  style,
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: fill,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fill]);

  const circleCircumference = 2 * Math.PI * ((size - width) / 2);
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circleCircumference, 0],
  });

  const rotate = `${rotation}deg`;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <View style={[styles.progressCircle, { transform: [{ rotate }] }]}>
        <Svg width={size} height={size}>
          <SvgCircle
            cx={size / 2}
            cy={size / 2}
            r={(size - width) / 2}
            stroke={backgroundColor}
            strokeWidth={width}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={(size - width) / 2}
            stroke={tintColor}
            strokeWidth={width}
            fill="none"
            strokeDasharray={[circleCircumference]}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      {children && <View style={styles.children}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  children: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CircularProgress;