import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  interpolateColor
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme/colors';

export type UserRole = 'farmer' | 'bank';

interface RoleSelectorProps {
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function RoleSelector({ selectedRole, onSelectRole }: RoleSelectorProps) {
  const farmerStyle = useAnimatedStyle(() => {
    const selected = selectedRole === 'farmer';
    return {
      backgroundColor: withSpring(
        selected ? theme.colors.primary : 'transparent'
      ),
      transform: [{ scale: withSpring(selected ? 1.05 : 1) }],
    };
  });

  const bankStyle = useAnimatedStyle(() => {
    const selected = selectedRole === 'bank';
    return {
      backgroundColor: withSpring(
        selected ? theme.colors.primary : 'transparent'
      ),
      transform: [{ scale: withSpring(selected ? 1.05 : 1) }],
    };
  });

  return (
    <View style={styles.container}>
      <AnimatedTouchable
        style={[styles.roleButton, farmerStyle]}
        onPress={() => onSelectRole('farmer')}
      >
        <Icon 
          name="tractor" 
          size={32} 
          color={selectedRole === 'farmer' ? '#FFF' : theme.colors.primary} 
        />
        <ThemedText
          style={[
            styles.roleText,
            selectedRole === 'farmer' && styles.selectedText
          ]}
        >
          Nông dân
        </ThemedText>
      </AnimatedTouchable>

      <AnimatedTouchable
        style={[styles.roleButton, bankStyle]}
        onPress={() => onSelectRole('bank')}
      >
        <Icon 
          name="bank" 
          size={32} 
          color={selectedRole === 'bank' ? '#FFF' : theme.colors.primary} 
        />
        <ThemedText
          style={[
            styles.roleText,
            selectedRole === 'bank' && styles.selectedText
          ]}
        >
          Ngân hàng/HTX
        </ThemedText>
      </AnimatedTouchable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 16,
  },
  roleButton: {
    flex: 1,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  roleText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedText: {
    color: '#FFF',
  },
});
