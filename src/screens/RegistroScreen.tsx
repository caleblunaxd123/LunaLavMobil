import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  checkSlug, registerTrial, RegistrationUnavailableError, requestTrial,
  type SlugCheck, type TrialLeadPayload, type TrialRegistrationResponse,
} from '../api/authApi';
import {
  AppText, BottomBar, Button, Card, Checkbox, InlineAlert, Screen, StackHeader, Steps, TextField,
} from '../components/ui';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { AuthStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, radius, space } from '../theme';
import { celularValido, emailValido, passwordStrength, slugError, slugify, usuarioError } from '../utils/validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Registro'>;
type Plan = TrialLeadPayload['planInteres'];

const STEPS = ['Tu lavandería', 'Tu cuenta', 'Tu plan', 'Confirmar'];
const plans: { code: Plan; name: string; price: string; tagline: string; features: string[]; popular?: boolean }[] = [
  { code: 'BASICO', name: 'Básico', price: '20', tagline: 'Para empezar a ordenar tu local', features: ['Pedidos, clientes y caja', 'Avisos por WhatsApp', 'App móvil incluida'] },
  { code: 'FACTURA', name: 'Factura', price: '50', tagline: 'Emite comprobantes a SUNAT', features: ['Todo lo del Básico', 'Boletas y facturas electrónicas', 'Reportes de ventas'], popular: true },
  { code: 'MULTISEDE', name: 'Multisede', price: '80', tagline: 'Para cadenas y varios locales', features: ['Todo lo de Factura', 'Varias sedes y consolidado', 'Permisos por rol'] },
];

type Result = { kind: 'created'; data: TrialRegistrationResponse } | { kind: 'lead'; message: string };

export function RegistroScreen({ navigation }: Props) {
  const login = useAuthStore((s) => s.login);
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});

  // Paso 1 — lavandería
  const [negocio, setNegocio] = useState('');
  const [slugManual, setSlugManual] = useState<string | null>(null);
  // Código de empresa sugerido a partir del nombre, hasta que el usuario lo edite.
  const slug = slugManual ?? slugify(negocio);
  const [sede, setSede] = useState('Principal');
  const [celular, setCelular] = useState('');
  // Paso 2 — cuenta
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  // Paso 3 — plan
  const [plan, setPlan] = useState<Plan>('BASICO');
  // Paso 4 — confirmación
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [entering, setEntering] = useState(false);

  const debouncedSlug = useDebouncedValue(slug, 500);
  const [slugCheck, setSlugCheck] = useState<SlugCheck & { slug?: string }>({ status: 'unknown' });
  useEffect(() => {
    if (slugError(debouncedSlug)) return;
    let active = true;
    void checkSlug(debouncedSlug).then((r) => { if (active) setSlugCheck({ ...r, slug: debouncedSlug }); });
    return () => { active = false; };
  }, [debouncedSlug]);
  const slugTaken = slugCheck.status === 'taken' && slugCheck.slug === slug;

  const strength = passwordStrength(password);
  const errors: Record<number, Record<string, string>> = {
    0: {
      negocio: negocio.trim().length < 2 ? 'Escribe el nombre de tu lavandería.' : '',
      slug: slugError(slug) || (slugTaken && slugCheck.status === 'taken' ? slugCheck.message : ''),
      sede: sede.trim().length < 2 ? 'Ponle un nombre a tu local (ej. Principal).' : '',
      celular: !celularValido(celular) ? 'Ingresa un celular válido (solo números).' : '',
    },
    1: {
      nombre: nombre.trim().length < 2 ? 'Escribe tu nombre completo.' : '',
      email: !emailValido(email) ? 'Ingresa un correo válido.' : '',
      usuario: usuarioError(usuario.trim()),
      password: password.length < 8 ? 'Usa al menos 8 caracteres.' : '',
      password2: password2 !== password ? 'Las contraseñas no coinciden.' : '',
    },
    2: {},
    3: { terms: !terms ? 'Debes aceptar los términos para continuar.' : '' },
  };
  const stepValid = (i: number) => Object.values(errors[i]).every((e) => !e);
  const show = (i: number, field: string) => (attempted[i] ? errors[i][field] : '');

  const goTo = (next: number) => { setStep(next); setError(''); scrollRef.current?.scrollTo({ y: 0, animated: false }); };
  const next = () => {
    setAttempted((a) => ({ ...a, [step]: true }));
    if (!stepValid(step)) return;
    if (step < STEPS.length - 1) goTo(step + 1); else void submit();
  };
  const back = () => (step === 0 ? navigation.goBack() : goTo(step - 1));

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const data = await registerTrial({
        nombreNegocio: negocio.trim(), slug, nombreResponsable: nombre.trim(), email: email.trim().toLowerCase(),
        celular: celular.replace(/\s/g, ''), usuario: usuario.trim().toLowerCase(), password, plan,
        sedeNombre: sede.trim(), aceptaTerminos: true,
      });
      setResult({ kind: 'created', data });
    } catch (e) {
      if (e instanceof RegistrationUnavailableError) {
        // Mientras el alta automática no esté publicada, no se pierde el interesado.
        try {
          const message = await requestTrial({ nombre: nombre.trim(), negocio: negocio.trim(), celular: celular.replace(/\s/g, ''), email: email.trim(), planInteres: plan, consentimiento: true });
          setResult({ kind: 'lead', message });
        } catch (leadError) {
          setError(leadError instanceof Error ? leadError.message : 'No pudimos enviar tu solicitud.');
        }
      } else {
        setError(e instanceof Error ? e.message : 'No se pudo crear tu cuenta.');
      }
    } finally {
      setBusy(false);
    }
  };

  const enter = async () => {
    if (result?.kind !== 'created') return;
    setEntering(true);
    const ok = await login({ empresaSlug: result.data.slug, usuario: usuario.trim().toLowerCase(), password });
    setEntering(false);
    if (!ok) navigation.replace('Login', { empresaSlug: result.data.slug, usuario: usuario.trim().toLowerCase() });
  };

  if (result) return <Success result={result} slug={slug} usuario={usuario.trim().toLowerCase()} entering={entering} onEnter={enter}
    onClose={() => navigation.popToTop()} />;

  return (
    <Screen edges={['top']}>
      <StackHeader title="Crear cuenta" subtitle="Prueba gratis por 14 días" onBack={back} />
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Steps steps={STEPS} current={step} />

        {step === 0 && <View style={styles.form}>
          <Intro title="Cuéntanos de tu lavandería" text="Con esto creamos tu espacio privado. Tus datos nunca se mezclan con los de otras lavanderías." />
          <TextField label="Nombre de la lavandería" icon="storefront-outline" placeholder="Ej. Lavandería Primavera"
            value={negocio} onChangeText={setNegocio} autoCapitalize="words" maxLength={120} error={show(0, 'negocio')} />
          <TextField label="Código de empresa" icon="link-outline" placeholder="lavanderia-primavera" value={slug}
            onChangeText={(v) => setSlugManual(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            autoCorrect={false} maxLength={50} error={show(0, 'slug') || (slugTaken ? errors[0].slug : '')}
            hint={`Con este código tu equipo inicia sesión. Tu enlace: app.lunalav.pe/${slug || 'tu-empresa'}`}
            right={<SlugStatus check={slugCheck} slug={slug} />} />
          <TextField label="Nombre de tu local" icon="location-outline" placeholder="Principal" value={sede}
            onChangeText={setSede} autoCapitalize="words" maxLength={80} error={show(0, 'sede')}
            hint="Si tienes varios locales, podrás agregarlos después." />
          <TextField label="Celular / WhatsApp" icon="logo-whatsapp" placeholder="999 999 999" value={celular}
            onChangeText={(v) => setCelular(v.replace(/[^\d+\s]/g, ''))} keyboardType="phone-pad" maxLength={20} error={show(0, 'celular')} />
        </View>}

        {step === 1 && <View style={styles.form}>
          <Intro title="Crea tu cuenta de administrador" text="Tendrás acceso total. Luego podrás crear usuarios para tu equipo con permisos limitados." />
          <TextField label="Tu nombre completo" icon="person-outline" placeholder="Nombre y apellido" value={nombre}
            onChangeText={setNombre} autoCapitalize="words" maxLength={120} error={show(1, 'nombre')} />
          <TextField label="Correo electrónico" icon="mail-outline" placeholder="tu@correo.com" value={email}
            onChangeText={setEmail} keyboardType="email-address" autoComplete="email" error={show(1, 'email')}
            hint="Te enviaremos novedades de tu cuenta y del período de prueba." />
          <TextField label="Usuario" icon="at-outline" placeholder="ej. rosa" value={usuario}
            onChangeText={(v) => setUsuario(v.toLowerCase().replace(/\s/g, ''))} autoCorrect={false} maxLength={50} error={show(1, 'usuario')}
            hint="Lo usarás junto al código de empresa para entrar." />
          <TextField label="Contraseña" icon="lock-closed-outline" placeholder="Mínimo 8 caracteres" password value={password}
            onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" error={show(1, 'password')} />
          {!!password && <StrengthMeter value={strength.value} label={strength.label} />}
          <TextField label="Repite la contraseña" icon="lock-closed-outline" placeholder="Vuelve a escribirla" password value={password2}
            onChangeText={setPassword2} error={show(1, 'password2') || (password2 && password2 !== password ? 'Las contraseñas no coinciden.' : '')} />
        </View>}

        {step === 2 && <View style={styles.form}>
          <Intro title="Elige tu plan" text="Los 14 días de prueba son gratis en cualquier plan. No pedimos tarjeta y puedes cambiarlo después." />
          {plans.map((p) => {
            const selected = plan === p.code;
            return (
              <Pressable key={p.code} onPress={() => setPlan(p.code)} accessibilityRole="radio" accessibilityState={{ checked: selected }}
                style={[styles.plan, selected && styles.planSelected]}>
                <View style={styles.planHead}>
                  <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>
                  <View style={styles.flex}>
                    <View style={styles.planTitleRow}>
                      <AppText variant="heading">{p.name}</AppText>
                      {p.popular && <View style={styles.popular}><AppText style={styles.popularText}>MÁS ELEGIDO</AppText></View>}
                    </View>
                    <AppText variant="caption">{p.tagline}</AppText>
                  </View>
                  <View style={styles.price}>
                    <AppText variant="number" color={colors.navy}>S/ {p.price}</AppText>
                    <AppText variant="caption">al mes</AppText>
                  </View>
                </View>
                <View style={styles.features}>
                  {p.features.map((f) => <View key={f} style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} /><AppText variant="caption" color={colors.textSecondary}>{f}</AppText>
                  </View>)}
                </View>
              </Pressable>
            );
          })}
        </View>}

        {step === 3 && <View style={styles.form}>
          <Intro title="Revisa y confirma" text="Verifica tus datos antes de crear tu lavandería." />
          <Summary title="Tu lavandería" onEdit={() => goTo(0)} rows={[
            ['Nombre', negocio.trim()], ['Código de empresa', slug], ['Local', sede.trim()], ['Celular', celular.trim()],
          ]} />
          <Summary title="Tu cuenta" onEdit={() => goTo(1)} rows={[
            ['Nombre', nombre.trim()], ['Correo', email.trim().toLowerCase()], ['Usuario', usuario.trim().toLowerCase()], ['Contraseña', '••••••••'],
          ]} />
          <Summary title="Plan" onEdit={() => goTo(2)} rows={[
            ['Plan elegido', plans.find((p) => p.code === plan)!.name], ['Hoy pagas', 'S/ 0.00 · 14 días gratis'],
          ]} />
          <Checkbox checked={terms} onChange={setTerms} label={<AppText variant="caption">
            Acepto los <AppText variant="captionStrong" color={colors.primary} onPress={() => void Linking.openURL('https://app.lunalav.pe/terminos')}>Términos</AppText> y
            la <AppText variant="captionStrong" color={colors.primary} onPress={() => void Linking.openURL('https://app.lunalav.pe/privacidad')}>Política de privacidad</AppText> de LunaLav.
          </AppText>} />
          {!!show(3, 'terms') && <AppText variant="caption" color={colors.danger}>{show(3, 'terms')}</AppText>}
          {!!error && <InlineAlert title="No pudimos crear tu cuenta" text={error} />}
        </View>}
      </ScrollView>
      <BottomBar>
        <View style={styles.actions}>
          {step > 0 && <Button label="Atrás" variant="secondary" onPress={back} style={styles.backBtn} disabled={busy} />}
          <Button label={step === STEPS.length - 1 ? 'Crear mi lavandería' : 'Continuar'} iconRight={step === STEPS.length - 1 ? undefined : 'arrow-forward'}
            onPress={next} busy={busy} style={styles.flex} />
        </View>
      </BottomBar>
    </Screen>
  );
}

function Intro({ title, text }: { title: string; text: string }) {
  return <View style={styles.intro}><AppText variant="title">{title}</AppText><AppText variant="body">{text}</AppText></View>;
}

function SlugStatus({ check, slug }: { check: SlugCheck & { slug?: string }; slug: string }) {
  if (!slug || slugError(slug)) return null;
  if (check.slug !== slug) return <ActivityIndicator size="small" color={colors.muted} />;
  if (check.status === 'available') return <Ionicons name="checkmark-circle" size={20} color={colors.success} accessibilityLabel="Disponible" />;
  if (check.status === 'taken') return <Ionicons name="close-circle" size={20} color={colors.danger} accessibilityLabel="No disponible" />;
  return null;
}

function StrengthMeter({ value, label }: { value: number; label: string }) {
  const tint = value <= 1 ? colors.danger : value === 2 ? colors.warning : colors.success;
  return (
    <View style={styles.strength} accessibilityLabel={`Seguridad de la contraseña: ${label}`}>
      <View style={styles.strengthBars}>{[1, 2, 3, 4].map((i) => <View key={i} style={[styles.strengthBar, i <= value && { backgroundColor: tint }]} />)}</View>
      <AppText variant="caption" color={tint}>{label}</AppText>
    </View>
  );
}

function Summary({ title, rows, onEdit }: { title: string; rows: [string, string][]; onEdit: () => void }) {
  return (
    <Card>
      <View style={styles.summaryHead}>
        <AppText variant="subheading">{title}</AppText>
        <Pressable onPress={onEdit} hitSlop={10} accessibilityRole="button"><AppText variant="captionStrong" color={colors.primary}>Editar</AppText></Pressable>
      </View>
      {rows.map(([k, v]) => <View key={k} style={styles.summaryRow}>
        <AppText variant="caption">{k}</AppText>
        <AppText variant="captionStrong" color={colors.text} style={styles.summaryValue} numberOfLines={1}>{v}</AppText>
      </View>)}
    </Card>
  );
}

function Success({ result, slug, usuario, entering, onEnter, onClose }: {
  result: Result; slug: string; usuario: string; entering: boolean; onEnter: () => void; onClose: () => void;
}) {
  const created = result.kind === 'created';
  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.success}>
        <View style={[styles.successIcon, { backgroundColor: created ? colors.successSoft : colors.primarySoft }]}>
          <Ionicons name={created ? 'checkmark-circle' : 'paper-plane'} size={46} color={created ? colors.success : colors.primary} />
        </View>
        <AppText variant="display" align="center">{created ? '¡Tu lavandería está lista!' : 'Recibimos tu solicitud'}</AppText>
        {created ? <>
          <AppText variant="body" align="center">
            Tu prueba gratis dura {result.data.diasPrueba} días (hasta el {new Date(result.data.pruebaHasta).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}).
            Guarda estos datos: tu equipo los necesitará para entrar.
          </AppText>
          <Card style={styles.credentials}>
            <View style={styles.summaryRow}><AppText variant="caption">Código de empresa</AppText><AppText variant="subheading">{result.data.slug || slug}</AppText></View>
            <View style={styles.summaryRow}><AppText variant="caption">Usuario</AppText><AppText variant="subheading">{usuario}</AppText></View>
          </Card>
          <Button label="Entrar a mi lavandería" iconRight="arrow-forward" onPress={onEnter} busy={entering} style={styles.fullWidth} />
        </> : <>
          <AppText variant="body" align="center">{result.message} Te escribiremos por WhatsApp para dejar tu cuenta lista.</AppText>
          <InlineAlert tone="info" text="Mientras tanto puedes explorar la demo con datos de ejemplo desde la pantalla de inicio." />
          <Button label="Volver al inicio" onPress={onClose} style={styles.fullWidth} />
        </>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.xl, paddingBottom: space.xxxl, gap: space.xl },
  form: { gap: space.lg },
  intro: { gap: 6, marginBottom: space.xs },
  actions: { flexDirection: 'row', gap: space.md },
  backBtn: { width: 110 },
  plan: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: space.lg, gap: space.md },
  planSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#F7FBFF' },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  popular: { backgroundColor: colors.violetSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  popularText: { fontFamily: fonts.bold, fontSize: 9.5, color: colors.violet, letterSpacing: 0.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  price: { alignItems: 'flex-end' },
  features: { gap: 6, paddingLeft: 34 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strength: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: -space.sm },
  strengthBars: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  summaryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, paddingVertical: 5 },
  summaryValue: { flex: 1, textAlign: 'right' },
  success: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: space.xxl, gap: space.lg },
  successIcon: { width: 92, height: 92, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  credentials: { alignSelf: 'stretch' },
  fullWidth: { alignSelf: 'stretch' },
});
