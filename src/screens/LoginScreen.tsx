import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '../components/Brand';
import { Field } from '../components/Field';
import type { AuthStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [empresaSlug, setEmpresaSlug] = useState(''); const [usuario, setUsuario] = useState(''); const [password, setPassword] = useState('');
  const { login, busy, error, clearError } = useAuthStore();
  const valid = empresaSlug.trim().length >= 2 && usuario.trim().length >= 3 && password.length >= 4;
  const submit = async () => { clearError(); if (valid) await login({ empresaSlug: empresaSlug.trim().toLowerCase(), usuario: usuario.trim(), password }); };

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={23} color={colors.navy} /></Pressable><Brand />
      <View style={styles.header}><Text style={styles.title}>Bienvenido de nuevo</Text><Text style={styles.subtitle}>Ingresa a tu lavandería con los datos de tu empresa.</Text></View>
      <View style={styles.form}>
        <Field label="Código de empresa" icon="business-outline" placeholder="ej. lavandaluna" value={empresaSlug} onChangeText={setEmpresaSlug} autoCorrect={false} />
        <Text style={styles.help}>Es el nombre que aparece en app.lunalav.pe/<Text style={styles.helpStrong}>tu-empresa</Text></Text>
        <Field label="Usuario" icon="person-outline" placeholder="Tu usuario" value={usuario} onChangeText={setUsuario} autoCorrect={false} />
        <Field label="Contraseña" icon="lock-closed-outline" placeholder="Tu contraseña" value={password} onChangeText={setPassword} password onSubmitEditing={submit} />
        {error && <View style={styles.errorBox}><Ionicons name="alert-circle" size={19} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View>}
        <Pressable style={[styles.button, !valid && styles.disabled]} onPress={submit} disabled={!valid || busy}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Ingresar</Text>}</Pressable>
      </View>
      <Pressable onPress={() => navigation.navigate('Trial')} style={styles.newAccount}><Text style={styles.newAccountText}>¿Aún no tienes cuenta? <Text style={styles.link}>Prueba LunaLav gratis</Text></Text></Pressable>
      <View style={styles.security}><Ionicons name="shield-checkmark-outline" size={18} color={colors.success} /><Text style={styles.securityText}>Tu sesión se guarda cifrada en el dispositivo.</Text></View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, content: { flexGrow: 1, padding: 24 }, back: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: 24 },
  header: { marginTop: 52, marginBottom: 30 }, title: { color: colors.navy, fontSize: 31, fontWeight: '900', letterSpacing: -0.7 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 8 }, form: { gap: 17 }, help: { color: colors.muted, fontSize: 12, marginTop: -10, marginLeft: 4 }, helpStrong: { color: colors.primary, fontWeight: '800' },
  button: { height: 56, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 }, disabled: { opacity: 0.45 }, buttonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 }, errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#FFF0F3' }, errorText: { color: colors.danger, flex: 1, lineHeight: 19 },
  newAccount: { paddingVertical: 24, alignItems: 'center' }, newAccountText: { color: colors.muted }, link: { color: colors.primary, fontWeight: '900' }, security: { marginTop: 'auto', flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center' }, securityText: { color: colors.muted, fontSize: 12 },
});
