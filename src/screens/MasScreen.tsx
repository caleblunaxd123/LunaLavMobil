import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Fragment } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Logo } from '../components/brand';
import { alerta, AppText, Avatar, Badge, Card, Divider, ListItem, Screen, Section, TabHeader } from '../components/ui';
import { usePermissions, type Modulo } from '../hooks/usePermissions';
import type { TabScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, space } from '../theme';
import { useOpenWeb } from '../utils/web';

type IconName = keyof typeof Ionicons.glyphMap;

// Módulos de gestión: se usan en el celular y cada pantalla tiene un atajo para abrirla en la web.
type Gestion = 'Reportes' | 'CuadreCaja' | 'Comprobantes' | 'Promociones' | 'Configuracion';
const gestion: { label: string; hint: string; icon: IconName; screen: Gestion; module: Modulo; adminOnly?: boolean }[] = [
  { label: 'Reportes', hint: 'Ventas, servicios y cobros del mes', icon: 'bar-chart-outline', screen: 'Reportes', module: 'REPORTES' },
  { label: 'Cuadre de caja', hint: 'Cierre del día', icon: 'calculator-outline', screen: 'CuadreCaja', module: 'CAJA' },
  { label: 'Comprobantes', hint: 'Boletas y facturas SUNAT', icon: 'document-text-outline', screen: 'Comprobantes', module: 'PEDIDOS' },
  { label: 'Promociones', hint: 'Descuentos y códigos', icon: 'pricetag-outline', screen: 'Promociones', module: 'PROMOCIONES', adminOnly: true },
  { label: 'Configuración', hint: 'Precios, usuarios y ajustes', icon: 'settings-outline', screen: 'Configuracion', module: 'AJUSTES', adminOnly: true },
];

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const DELETE_ACCOUNT_URL = 'https://app.lunalav.pe/eliminar-cuenta';

function Icon({ name, tint = colors.primary }: { name: IconName; tint?: string }) {
  return <View style={[styles.icon, { backgroundColor: `${tint}14` }]}><Ionicons name={name} size={19} color={tint} /></View>;
}

export function MasScreen({ navigation }: TabScreenProps<'Más'>) {
  const session = useAuthStore((s) => s.session)!;
  const logout = useAuthStore((s) => s.logout);
  const empresaSlug = useAuthStore((s) => s.lastLogin?.empresaSlug);
  const can = usePermissions();
  const openWeb = useOpenWeb();
  const { usuario } = session;
  const tools = gestion.filter((t) => can(t.module) && (!t.adminOnly || usuario.rol === 'ADMIN'));

  const confirmLogout = () => alerta('Cerrar sesión', '¿Quieres salir de LunaLav en este dispositivo?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Cerrar sesión', onPress: () => void logout() },
  ], { icon: 'log-out' });

  // Google Play exige poder pedir la eliminación de la cuenta desde la app. La solicitud se
  // confirma con el titular antes de borrar datos, por eso se envía por correo con los datos
  // de la cuenta ya completados.
  const requestDeletion = () => {
    const isAdmin = usuario.rol === 'ADMIN';
    alerta('Eliminar mi cuenta',
      isAdmin
        ? 'Se eliminarán tu lavandería y todos sus datos: sedes, usuarios, clientes, pedidos y caja. Te pediremos confirmación por correo o WhatsApp antes de hacerlo.'
        : 'Se eliminará tu usuario. Los pedidos que registraste seguirán siendo de la lavandería. Te pediremos confirmación antes de hacerlo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Más información', onPress: () => void Linking.openURL(DELETE_ACCOUNT_URL) },
        { text: 'Solicitar', style: 'destructive', onPress: () => {
          const body = [
            'Solicito eliminar mi cuenta de LunaLav.', '',
            `Código de empresa: ${empresaSlug ?? '(no disponible)'}`,
            `Usuario: ${usuario.usuario}`,
            `Nombre: ${usuario.nombreCompleto}`,
            `Rol: ${usuario.rol}`,
          ].join('\n');
          void Linking.openURL(`mailto:contacto@lunalav.pe?subject=${encodeURIComponent('Eliminar mi cuenta de LunaLav')}&body=${encodeURIComponent(body)}`)
            .catch(() => void Linking.openURL(DELETE_ACCOUNT_URL));
        } },
      ], { icon: 'person-remove' });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <TabHeader title="Más" />
        <Card style={styles.profile}>
          <Avatar name={usuario.nombreCompleto} size={56} />
          <View style={styles.flex}>
            <AppText variant="heading" numberOfLines={1}>{usuario.nombreCompleto}</AppText>
            <AppText variant="caption">@{usuario.usuario}</AppText>
            <View style={styles.badges}>
              {usuario.rol !== 'DEMO' && <Badge label={usuario.rol === 'ADMIN' ? 'Administrador' : usuario.rol.charAt(0) + usuario.rol.slice(1).toLowerCase()} tone="primary" dot={false} />}
              {session.isDemo && <Badge label="Demo" tone="violet" dot={false} />}
            </View>
          </View>
        </Card>

        <Section title="Operación">
          <Card padded={false}>
            <ListItem title="Sede de trabajo" subtitle={usuario.sedeNombre ?? 'Sin sede asignada'} leading={<Icon name="storefront-outline" />}
              chevron={usuario.rol === 'ADMIN'} onPress={usuario.rol === 'ADMIN' ? () => navigation.navigate('SeleccionarSede') : undefined} />
            {can('INVENTARIO') && <><Divider inset={68} />
              <ListItem title="Inventario" subtitle="Stock de insumos y compras" leading={<Icon name="cube-outline" tint={colors.warning} />}
                chevron onPress={() => navigation.navigate('Inventario')} /></>}
            {can('CAJA_REGISTRAR_GASTO') && <><Divider inset={68} />
              <ListItem title="Registrar gasto" subtitle="Compras, servicios, pagos" leading={<Icon name="remove-circle-outline" tint={colors.danger} />}
                chevron onPress={() => navigation.navigate('NuevoGasto')} /></>}
          </Card>
        </Section>

        {tools.length > 0 && <Section title="Gestión">
          <Card padded={false}>
            {tools.map((t, i) => <Fragment key={t.screen}>
              {i > 0 && <Divider inset={68} />}
              <ListItem title={t.label} subtitle={t.hint} leading={<Icon name={t.icon} tint={colors.navySoft} />}
                chevron onPress={() => navigation.navigate(t.screen)} />
            </Fragment>)}
            <Divider inset={68} />
            <ListItem title="Abrir LunaLav web" subtitle="Todo el sistema en el navegador" leading={<Icon name="desktop-outline" tint={colors.teal} />}
              trailing={<Ionicons name="open-outline" size={17} color={colors.placeholder} />} onPress={() => openWeb('inicio')} />
          </Card>
          <AppText variant="caption" style={styles.note}>Cada módulo tiene el botón <Ionicons name="open-outline" size={12} color={colors.muted} /> para verlo en la web con tu misma cuenta.</AppText>
        </Section>}

        <Section title="Ayuda y cuenta">
          <Card padded={false}>
            <ListItem title="Escríbenos" subtitle="contacto@lunalav.pe" leading={<Icon name="mail-outline" tint={colors.teal} />}
              onPress={() => void Linking.openURL('mailto:contacto@lunalav.pe')} />
            <Divider inset={68} />
            <ListItem title="Política de privacidad" leading={<Icon name="shield-checkmark-outline" tint={colors.muted} />}
              trailing={<Ionicons name="open-outline" size={17} color={colors.placeholder} />} onPress={() => void Linking.openURL('https://app.lunalav.pe/privacidad')} />
            <Divider inset={68} />
            <ListItem title="Términos del servicio" leading={<Icon name="document-outline" tint={colors.muted} />}
              trailing={<Ionicons name="open-outline" size={17} color={colors.placeholder} />} onPress={() => void Linking.openURL('https://app.lunalav.pe/terminos')} />
            <Divider inset={68} />
            <ListItem title="Cerrar sesión" danger leading={<Icon name="log-out-outline" tint={colors.danger} />} onPress={confirmLogout} />
          </Card>
        </Section>
        {!session.isDemo && <Pressable onPress={requestDeletion} hitSlop={8} accessibilityRole="button" style={styles.delete}>
          <AppText variant="caption" color={colors.danger}>Eliminar mi cuenta</AppText>
        </Pressable>}
        <View style={styles.footer}>
          <Logo width={170} />
          <AppText variant="caption" align="center">LunaLav Móvil · versión {APP_VERSION}</AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: space.sm, paddingHorizontal: space.xs },
  delete: { alignSelf: 'center', marginTop: space.lg, paddingVertical: space.sm, paddingHorizontal: space.lg },
  footer: { alignItems: 'center', gap: space.sm, marginTop: space.xl },
});
