import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '../components/Field';
import { registerTrial, TrialLeadPayload } from '../api/authApi';
import type { AuthStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'Trial'>;
const plans: { code: TrialLeadPayload['planInteres']; name: string; price: string; caption: string }[] = [
  { code: 'BASICO', name: 'Básico', price: 'S/ 20', caption: 'Pedidos, clientes y caja' },
  { code: 'FACTURA', name: 'Factura', price: 'S/ 50', caption: 'Incluye facturación electrónica' },
  { code: 'MULTISEDE', name: 'Multisede', price: 'S/ 80', caption: 'Para más de un local' },
];

export function TrialScreen({ navigation }: Props) {
  const [nombre, setNombre] = useState(''); const [negocio, setNegocio] = useState(''); const [celular, setCelular] = useState(''); const [email, setEmail] = useState('');
  const [slug, setSlug] = useState(''); const [usuario, setUsuario] = useState(''); const [password, setPassword] = useState('');
  const [plan, setPlan] = useState<TrialLeadPayload['planInteres']>('BASICO'); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState('');
  const [terms, setTerms] = useState(false);
  const login = useAuthStore((state) => state.login);
  const valid = nombre.trim().length >= 2 && negocio.trim().length >= 2 && celular.trim().length >= 7
    && email.includes('@') && slug.trim().length >= 2 && usuario.trim().length >= 3 && password.length >= 8 && terms;
  const submit = async () => {
    if (!valid) return;
    setBusy(true); setError('');
    try {
      const registration = await registerTrial({
        nombreNegocio: negocio.trim(), slug: slug.trim().toLowerCase(), nombreResponsable: nombre.trim(),
        email: email.trim().toLowerCase(), celular: celular.trim(), usuario: usuario.trim().toLowerCase(),
        password, plan, sedeNombre: 'Principal', aceptaTerminos: true,
      });
      const entered = await login({ empresaSlug: registration.slug, usuario: usuario.trim(), password });
      if (!entered) setDone(`La empresa ${registration.slug} fue creada hasta ${registration.pruebaHasta}. Inicia sesión con las credenciales que elegiste.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear la prueba.'); }
    finally { setBusy(false); }
  };

  if (done) return <SafeAreaView style={styles.safe}><View style={styles.successPage}><View style={styles.successIcon}><Ionicons name="checkmark" size={42} color="#FFFFFF" /></View><Text style={styles.successTitle}>¡Tu lavandería está creada!</Text><Text style={styles.successText}>{done}</Text><Pressable style={styles.submit} onPress={() => navigation.navigate('Login')}><Text style={styles.submitText}>Ir a iniciar sesión</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <View style={styles.top}><Pressable onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={23} color={colors.navy} /></Pressable><View style={styles.step}><Text style={styles.stepText}>PRUEBA GRATUITA</Text></View></View>
    <Text style={styles.title}>Empieza a ordenar tu lavandería</Text><Text style={styles.subtitle}>Crea tu espacio privado por 14 días. No necesitas tarjeta.</Text>
    <View style={styles.planList}>{plans.map((item) => <Pressable key={item.code} onPress={() => setPlan(item.code)} style={[styles.plan, plan === item.code && styles.planSelected]}><View style={[styles.radio, plan === item.code && styles.radioSelected]}>{plan === item.code && <View style={styles.radioInner} />}</View><View style={styles.planCopy}><Text style={styles.planName}>{item.name}</Text><Text style={styles.planCaption}>{item.caption}</Text></View><Text style={styles.price}>{item.price}<Text style={styles.month}>/mes</Text></Text></Pressable>)}</View>
    <View style={styles.form}><Field label="Tu nombre" icon="person-outline" placeholder="Nombre del responsable" value={nombre} onChangeText={setNombre} autoCapitalize="words" /><Field label="Nombre de la lavandería" icon="business-outline" placeholder="Ej. Lavandería Primavera" value={negocio} onChangeText={setNegocio} autoCapitalize="words" /><Field label="Código de empresa" icon="link-outline" placeholder="ej. lavanderia-primavera" value={slug} onChangeText={(value) => setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} autoCorrect={false} /><Text style={styles.fieldHint}>Será tu identificador único para ingresar a LunaLav.</Text><Field label="Celular" icon="logo-whatsapp" placeholder="+51 999 999 999" value={celular} onChangeText={setCelular} keyboardType="phone-pad" /><Field label="Correo" icon="mail-outline" placeholder="tu@correo.com" value={email} onChangeText={setEmail} keyboardType="email-address" /><Field label="Usuario administrador" icon="person-circle-outline" placeholder="Tu usuario" value={usuario} onChangeText={setUsuario} autoCorrect={false} /><Field label="Contraseña" icon="lock-closed-outline" placeholder="Mínimo 8 caracteres" value={password} onChangeText={setPassword} password /></View>
    <Pressable style={styles.terms} onPress={() => setTerms((value) => !value)}><View style={[styles.checkbox, terms && styles.checkboxChecked]}>{terms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}</View><Text style={styles.termsText}>Acepto los Términos y la Política de privacidad de LunaLav.</Text></Pressable>
    {error ? <Text style={styles.error}>{error}</Text> : null}<Pressable style={[styles.submit, !valid && styles.disabled]} disabled={!valid || busy} onPress={submit}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Crear mi prueba de 14 días</Text>}</Pressable>
    <View style={styles.consent}><Ionicons name="shield-checkmark-outline" size={18} color={colors.success} /><Text style={styles.consentText}>Tus datos quedarán aislados de otras lavanderías. Podrás conservarlos al contratar un plan.</Text></View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, content: { padding: 24, paddingBottom: 36 }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }, step: { backgroundColor: '#E3F5FF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 }, stepText: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.navy, fontSize: 30, lineHeight: 35, fontWeight: '900', marginTop: 28 }, subtitle: { color: colors.muted, lineHeight: 22, marginTop: 8, marginBottom: 22 }, planList: { gap: 10, marginBottom: 25 }, plan: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF' }, planSelected: { borderColor: colors.primary, backgroundColor: '#F0F9FF' }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#B5C7D7', alignItems: 'center', justifyContent: 'center', marginRight: 11 }, radioSelected: { borderColor: colors.primary }, radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }, planCopy: { flex: 1 }, planName: { color: colors.navy, fontWeight: '900' }, planCaption: { color: colors.muted, fontSize: 11, marginTop: 2 }, price: { color: colors.primary, fontWeight: '900', fontSize: 16 }, month: { color: colors.muted, fontSize: 9 },
  form: { gap: 17 }, fieldHint: { color: colors.muted, fontSize: 11, marginTop: -10, marginLeft: 4 }, terms: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 20 }, checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1.5, borderColor: '#AFC5D6', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, checkboxChecked: { borderColor: colors.primary, backgroundColor: colors.primary }, termsText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18 }, submit: { height: 56, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 22, paddingHorizontal: 40 }, submitText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 }, disabled: { opacity: 0.45 }, error: { color: colors.danger, marginTop: 14, textAlign: 'center' }, consent: { flexDirection: 'row', gap: 8, marginTop: 15, paddingHorizontal: 4 }, consentText: { color: colors.muted, flex: 1, fontSize: 11, lineHeight: 16 },
  successPage: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' }, successIcon: { width: 82, height: 82, borderRadius: 41, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, successTitle: { color: colors.navy, fontSize: 29, fontWeight: '900', textAlign: 'center' }, successText: { color: colors.muted, lineHeight: 23, textAlign: 'center', marginTop: 10 }, notice: { flexDirection: 'row', gap: 10, backgroundColor: '#F1EEFF', padding: 16, borderRadius: 16, marginTop: 24 }, noticeText: { flex: 1, color: '#54417E', lineHeight: 20 },
});
