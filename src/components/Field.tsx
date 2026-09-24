import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';

interface FieldProps extends TextInputProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  password?: boolean;
}

export const Field = forwardRef<TextInput, FieldProps>(({ label, icon, password, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <Ionicons name={icon} size={20} color={colors.muted} />
        <TextInput ref={ref} placeholderTextColor="#94A3B8" secureTextEntry={password && !visible}
          autoCapitalize="none" style={styles.input} {...props} />
        {password && <TouchableOpacity onPress={() => setVisible((value) => !value)} hitSlop={12}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.muted} />
        </TouchableOpacity>}
      </View>
    </View>
  );
});
Field.displayName = 'Field';

const styles = StyleSheet.create({
  group: { gap: 7 }, label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  field: { height: 55, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: '#FFFFFF' },
  input: { flex: 1, color: colors.text, fontSize: 16 },
});
