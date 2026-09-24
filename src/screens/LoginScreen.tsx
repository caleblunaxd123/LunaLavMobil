import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import { Logo } from '../components/brand';
import { AppText, Button, IconButton, InlineAlert, Screen, TextField } from '../components/ui';
import type { AuthStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, space } from '../theme';
import { normalizeEmpresa } from '../utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation, route }: Props) {
  const { login, busy, error, clearError, lastLogin } = useAuthStore();
  const [empresaSlug, setEmpresaSlug] = useState(route.params?.empresaSlug ?? lastLogin?.empresaSlug ?? '');
  const [usuario, setUsuario] = useState(route.params?.usuario ?? lastLogin?.usuario ?? '');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const usuarioRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // El error del store es compartido (demo, sesión expirada): aquí solo se muestran los del login.
  useEffect(() => { clearError(); }, [clearError]);
  // Al corregir cualquier campo, el aviso del intento anterior deja de aplicar.
  const edit = (setter: (v: string) => void) => (v: string) => { setter(v); if (error) clearError(); };

  const errors = {
    empresa: empresaSlug.trim().length < 2 ? 'Ingresa el código de tu empresa.' : '',
    usuario: usuario.trim().length < 3 ? 'Ingresa tu usuario.' : '',
    password: password.length < 4 ? 'Ingresa tu contraseña.' : '',
  };
  const valid = !errors.empresa && !errors.usuario && !errors.password;

  const submit = async () => {
    setSubmitted(true);
    clearError();
    if (valid) await login({ empresaSlug: normalizeEmpresa(empresaSlug), usuario: usuario.trim(), password });
  };

  const forgot = () => Alert.alert('¿Olvidaste tu contraseña?',
    'Pide al administrador de tu lavandería que la restablezca desde Ajustes → Usuarios. Si eres el administrador, escríbenos a contacto@lunalav.pe.');

  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <IconButton icon="arrow-back" label="Volver" onPress={navigation.goBack} />
        </View>
        <Logo width={230} style={styles.logo} />

        <AppText variant="display" style={styles.title}>Inicia sesión</AppText>
        <AppText variant="body">Usa los datos que te dio el administrador de tu lavandería.</AppText>

        <View style={styles.form}>
          <TextField label="Código de empresa" icon="business-outline" placeholder="ej. lavanderia-primavera"
            value={empresaSlug} autoCorrect={false}
            onChangeText={edit((v) => setEmpresaSlug(/lunalav\.pe\//i.test(v) ? normalizeEmpresa(v) : v.toLowerCase().replace(/\s/g, '')))}
            returnKeyType="next" onSubmitEditing={() => usuarioRef.current?.focus()}
            error={submitted ? errors.empresa : ''} hint="Aparece en tu enlace web: app.lunalav.pe/tu-empresa" />
          <TextField ref={usuarioRef} label="Usuario" icon="person-outline" placeholder="Tu usuario"
            value={usuario} onChangeText={edit(setUsuario)} autoCorrect={false} autoComplete="username" textContentType="username"
            returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} error={submitted ? errors.usuario : ''} />
          <TextField ref={passwordRef} label="Contraseña" icon="lock-closed-outline" placeholder="Tu contraseña" password
            value={password} onChangeText={edit(setPassword)} autoComplete="password" textContentType="password"
            returnKeyType="go" onSubmitEditing={submit} error={submitted ? errors.password : ''} />
          <Pressable onPress={forgot} hitSlop={8} style={styles.forgot} accessibilityRole="button">
            <AppText variant="captionStrong" color={colors.primary}>¿Olvidaste tu contraseña?</AppText>
          </Pressable>
          {!!error && <InlineAlert title="No pudimos iniciar sesión" text={error} />}
          <Button label="Ingresar" onPress={submit} busy={busy} />
        </View>

        <View style={styles.footer}>
          <AppText variant="body" align="center">¿Aún no usas LunaLav?</AppText>
          <Button label="Crear cuenta gratis" variant="ghost" iconRight="arrow-forward" onPress={() => navigation.navigate('Registro')} />
        </View>
        <View style={styles.security}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
          <AppText variant="caption">Tu sesión se guarda cifrada en este dispositivo.</AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: space.xl },
  top: { flexDirection: 'row', alignItems: 'center' },
  logo: { alignSelf: 'center', marginTop: space.lg },
  title: { marginTop: space.xxl, marginBottom: space.xs },
  form: { gap: space.lg, marginTop: space.xxl },
  forgot: { alignSelf: 'flex-end', marginTop: -space.sm },
  footer: { marginTop: space.xxl, alignItems: 'center' },
  security: { marginTop: 'auto', paddingTop: space.xl, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' },
});
