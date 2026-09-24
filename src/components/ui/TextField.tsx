import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius } from '../../theme';
import { AppText } from './Text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
  error?: string;
  optional?: boolean;
  password?: boolean;
  right?: ReactNode;
  prefix?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, icon, hint, error, optional, password, right, prefix, multiline, style, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [visible, setVisible] = useState(false);
    const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
    return (
      <View style={styles.group}>
        <View style={styles.labelRow}>
          <AppText variant="captionStrong" color={colors.text}>{label}</AppText>
          {optional && <AppText variant="caption">Opcional</AppText>}
        </View>
        <View style={[styles.field, multiline && styles.multiline, { borderColor }, focused && styles.focused]}>
          {icon && <Ionicons name={icon} size={19} color={focused ? colors.primary : colors.placeholder} />}
          {prefix && <AppText variant="bodyStrong" color={colors.muted}>{prefix}</AppText>}
          <TextInput ref={ref} placeholderTextColor={colors.placeholder} secureTextEntry={password && !visible}
            autoCapitalize="none" multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'}
            accessibilityLabel={label}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }} onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            style={[styles.input, multiline && styles.inputMultiline, style]} {...props} />
          {password && <Pressable onPress={() => setVisible((v) => !v)} hitSlop={12}
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>}
          {right}
        </View>
        {error ? <View style={styles.messageRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <AppText variant="caption" color={colors.danger} style={styles.flex}>{error}</AppText>
        </View> : hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
    );
  });
TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  field: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.surface },
  focused: { borderWidth: 1.5 },
  multiline: { alignItems: 'flex-start', paddingVertical: 12, minHeight: 96 },
  // En web se quita el contorno del navegador: el borde del campo ya indica el foco.
  input: { flex: 1, color: colors.text, fontSize: 16, fontFamily: fonts.medium, paddingVertical: 12, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) } as object,
  inputMultiline: { paddingVertical: 0, minHeight: 70 },
  messageRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
});
