import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/colors';

interface RatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  label?: string;
  error?: string;
  required?: boolean;
  readonly?: boolean;
  style?: ViewStyle;
}

const Rating: React.FC<RatingProps> = ({
  value,
  onChange,
  size = 'medium',
  label,
  error,
  required = false,
  readonly = false,
  style,
}) => {
  const getStarSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 32;
      default:
        return 24;
    }
  };

  const renderStar = (index: number) => {
    const starSize = getStarSize();
    const isFilled = index < value;
    const starName = isFilled ? 'star' : 'star-outline';
    const starColor = isFilled ? theme.colors.warning : theme.colors.border;

    if (readonly) {
      return (
        <Icon
          key={index}
          name={starName}
          size={starSize}
          color={starColor}
          style={styles.star}
        />
      );
    }

    return (
      <TouchableOpacity
        key={index}
        onPress={() => onChange?.(index + 1)}
        style={styles.star}>
        <Icon name={starName} size={starSize} color={starColor} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={styles.starsContainer}>
        {[0, 1, 2, 3, 4].map(index => renderStar(index))}
        {/* <Text style={styles.ratingText}>{value.toFixed(1)}</Text> */}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: theme.colors.error,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: theme.spacing.xs,
  },
  ratingText: {
    marginLeft: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});

export default Rating; 