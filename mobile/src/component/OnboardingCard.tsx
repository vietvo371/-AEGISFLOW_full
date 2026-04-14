import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme/colors';

const { width } = Dimensions.get('window');

interface OnboardingCardProps {
  item: {
    id: number;
    title: string;
    description: string;
    image: any;
  };
}

const OnboardingCard: React.FC<OnboardingCardProps> = ({ item }) => {
  return (
    <View style={styles.card}>
      <Image source={item.image} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width * 0.7,
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 8,
    backgroundColor: theme.colors.white,
    ...theme.shadows.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    textAlign: 'center',
  },
});

export default OnboardingCard;

