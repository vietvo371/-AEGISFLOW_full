import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { launchImageLibrary } from 'react-native-image-picker';
import { mediaService } from '../../services/mediaService';

const UserProfileScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    name: (user as any)?.name || '',
    phone: (user as any)?.phone || '',
    avatar: (user as any)?.avatar || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: (user as any)?.name || '',
        phone: (user as any)?.phone || '',
        avatar: (user as any)?.avatar || '',
      });
    }
  }, [user]);

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7, maxWidth: 512, maxHeight: 512 });
      if (result.assets && result.assets.length > 0) {
        setUploadingAvatar(true);
        try {
          const response = await mediaService.uploadMedia(result.assets[0], 'image', 'phan_anh', 'Avatar');
          if (response.success && response.data) {
            setFormData(prev => ({ ...prev, avatar: response.data.url }));
          }
        } catch { /* */ } finally { setUploadingAvatar(false); }
      }
    } catch { /* */ }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setLoading(true);
    try {
      await authService.updateProfile({
        name: formData.name,
        phone: formData.phone,
        avatar: formData.avatar,
      } as any);
      setIsEditing(false);
    } catch { /* */ } finally { setLoading(false); }
  };

  const initials = formData.name
    ? formData.name.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase()
    : '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Icon name="pencil" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : <View style={{ width: 20 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {formData.avatar ? (
              <Image source={{ uri: formData.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            {isEditing && (
              <TouchableOpacity style={styles.cameraBtn} onPress={handlePickImage} disabled={uploadingAvatar}>
                {uploadingAvatar
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Icon name="camera" size={18} color="#fff" />}
              </TouchableOpacity>
            )}
          </View>
          {!isEditing && <Text style={styles.nameDisplay}>{formData.name}</Text>}
          {!isEditing && <Text style={styles.emailDisplay}>{(user as any)?.email}</Text>}
        </View>

        {/* Form */}
        <View style={styles.card}>
          <FieldRow
            icon="account-outline"
            label="Họ và tên"
            value={formData.name}
            editable={isEditing}
            onChangeText={t => setFormData(p => ({ ...p, name: t }))}
          />
          <FieldRow
            icon="email-outline"
            label="Email"
            value={(user as any)?.email || ''}
            editable={false}
          />
          <FieldRow
            icon="phone-outline"
            label="Số điện thoại"
            value={formData.phone}
            editable={isEditing}
            onChangeText={t => setFormData(p => ({ ...p, phone: t }))}
            last
          />
        </View>

        {/* Actions */}
        {isEditing && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsEditing(false); }}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Lưu thay đổi</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Simple field row component
import { TextInput } from 'react-native';

const FieldRow = ({ icon, label, value, editable = false, onChangeText, last }: {
  icon: string; label: string; value: string; editable?: boolean;
  onChangeText?: (t: string) => void; last?: boolean;
}) => (
  <View style={[fieldStyles.row, !last && fieldStyles.border]}>
    <Icon name={icon} size={18} color={theme.colors.textSecondary} />
    <View style={{ flex: 1 }}>
      <Text style={fieldStyles.label}>{label}</Text>
      {editable ? (
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={label}
          placeholderTextColor={theme.colors.textTertiary}
        />
      ) : (
        <Text style={fieldStyles.value}>{value || '—'}</Text>
      )}
    </View>
  </View>
);

const fieldStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  label: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 2 },
  value: { fontSize: 15, color: theme.colors.text },
  input: { fontSize: 15, color: theme.colors.text, padding: 0, borderBottomWidth: 1, borderBottomColor: theme.colors.primary + '40' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.colors.text },

  scroll: { padding: 20 },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: theme.colors.primary },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  nameDisplay: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 12 },
  emailDisplay: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },

  card: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, marginBottom: 20 },

  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

export default UserProfileScreen;
