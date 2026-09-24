import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import {
  crearPedido, getCliente, getClientes, getServicios, METODOS_PAGO,
  type Cliente, type CrearPedidoPayload, type MetodoPago, type Modalidad, type Servicio,
} from '../api/operationsApi';
import {
  AppText, Avatar, BottomBar, Button, Card, Choice, Divider, EmptyState, InlineAlert, ListItem, Screen, SearchBar,
  Section, StackHeader, Steps, TextField, toast,
} from '../components/ui';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, radius, space } from '../theme';
import { methodLabel, money, parseAmount } from '../utils/format';
import { celularValido } from '../utils/validation';

interface CartLine { servicio: Servicio; cantidad: string; precio: string }

const STEPS = ['Cliente', 'Prendas', 'Entrega y pago'];
const URGENT_PCT = 20;
const deliveryOptions = [{ days: 0, label: 'Hoy' }, { days: 1, label: 'Mañana' }, { days: 2, label: 'En 2 días' }, { days: 3, label: 'En 3 días' }];

/** Fecha de entrega a las 6 p. m. del día elegido, en hora local (igual que la web). */
function deliveryDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T18:00:00`;
}
const round10 = (value: number) => Math.round(value * 10) / 10;

export function NuevoPedidoScreen({ navigation, route }: AppScreenProps<'NuevoPedido'>) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  // Tras guardar se sale con replace(): no debe pedir confirmación de descarte.
  const saved = useRef(false);
  const presetId = route.params?.clienteId;
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});

  // Paso 1 — cliente
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [usePreset, setUsePreset] = useState(!!presetId);
  const [nuevo, setNuevo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [direccion, setDireccion] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const term = useDebouncedValue(busqueda.trim());
  const preset = useQuery({ queryKey: ['cliente', presetId], queryFn: () => getCliente(presetId!), enabled: usePreset && !!presetId });
  const elegido = cliente ?? (usePreset ? preset.data ?? null : null);
  const resultados = useQuery({
    queryKey: ['clientes', negocioId, term, 'picker'], queryFn: () => getClientes(term, 8), enabled: !elegido && !nuevo && term.length >= 2,
  });

  // Paso 2 — prendas
  const servicios = useQuery({ queryKey: ['servicios', negocioId], queryFn: getServicios, staleTime: 5 * 60_000 });
  const [busquedaServicio, setBusquedaServicio] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  // Paso 3 — entrega y pago
  const [modalidad, setModalidad] = useState<Modalidad>('Tienda');
  const [entregaDias, setEntregaDias] = useState<number | null>(1);
  const [urgente, setUrgente] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [adelanto, setAdelanto] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');

  const catalogo = useMemo(() => {
    const t = busquedaServicio.trim().toLowerCase();
    const list = servicios.data ?? [];
    return (t ? list.filter((s) => s.nombre.toLowerCase().includes(t)) : list).slice(0, t ? 30 : 12);
  }, [servicios.data, busquedaServicio]);

  const lines = cart.map((l) => {
    const cantidad = parseAmount(l.cantidad);
    const precio = parseAmount(l.precio);
    return { ...l, cantidadNum: cantidad, precioNum: precio, total: Number.isFinite(cantidad * precio) ? Math.round(cantidad * precio * 100) / 100 : 0 };
  });
  const prendas = lines.reduce((acc, l) => acc + (Number.isFinite(l.cantidadNum) ? l.cantidadNum : 0), 0);
  const subtotal = lines.reduce((acc, l) => acc + l.total, 0);
  const recargo = urgente ? Math.round(subtotal * URGENT_PCT) / 100 : 0;
  const total = round10(subtotal + recargo);
  const adelantoNum = adelanto.trim() ? parseAmount(adelanto) : 0;
  const direccionCliente = nuevo ? direccion.trim() : elegido?.direccion?.trim() ?? '';

  const errors: Record<number, string> = {
    0: !elegido && !nuevo ? 'Busca y elige un cliente, o registra uno nuevo.'
      : nuevo && nombre.trim().length < 2 ? 'Escribe el nombre del cliente.'
        : nuevo && celular.trim() && !celularValido(celular) ? 'El celular solo admite números.' : '',
    1: !lines.length ? 'Agrega al menos un servicio del catálogo.'
      : lines.some((l) => !(l.cantidadNum > 0) || l.cantidadNum > 10_000) ? 'Revisa las cantidades: deben ser mayores a 0.'
        : lines.some((l) => !(l.precioNum > 0) || l.precioNum > 10_000) ? 'Revisa los precios: deben ser mayores a 0.' : '',
    2: modalidad === 'Recojo' && !direccionCliente ? 'Para recojo a domicilio el cliente necesita una dirección.'
      : !Number.isFinite(adelantoNum) || adelantoNum < 0 ? 'El adelanto no es un monto válido.'
        : modalidad === 'Tienda' && adelantoNum > total + 0.01 ? `El adelanto no puede superar el total (${money(total)}).` : '',
  };

  const save = useMutation({
    mutationFn: () => {
      const payload: CrearPedidoPayload = {
        clienteId: nuevo ? undefined : elegido?.id,
        clienteNuevo: nuevo ? { nombre: nombre.trim(), celular: celular.replace(/\s/g, '') || null, direccion: direccion.trim() || null } : undefined,
        modalidad,
        items: lines.map((l) => ({ servicioId: l.servicio.id, cantidad: l.cantidadNum, precioUnit: l.precioNum })),
        descuentoPct: 0,
        esUrgente: urgente,
        montoPagado: adelantoNum,
        metodoPagoInicial: metodo,
        fechaEntregaEst: entregaDias == null ? undefined : deliveryDate(entregaDias),
        observaciones: observaciones.trim() || undefined,
      };
      return crearPedido(payload);
    },
    onSuccess: async (pedido) => {
      await Promise.all(['pedidos', 'dashboard', 'caja', 'clientes'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      toast(`Pedido #${pedido.numero} registrado`);
      saved.current = true;
      navigation.replace('PedidoDetalle', { id: pedido.id });
    },
  });

  const goTo = (i: number) => { setStep(i); scrollRef.current?.scrollTo({ y: 0, animated: false }); };
  const next = () => {
    setAttempted((a) => ({ ...a, [step]: true }));
    if (errors[step]) return;
    if (step < STEPS.length - 1) goTo(step + 1); else save.mutate();
  };

  // Cualquier salida (flecha, gesto o botón "atrás" de Android) pasa por aquí: en los pasos
  // intermedios retrocede un paso y, con datos cargados, pide confirmar antes de descartar.
  const dirty = step > 0 || !!elegido || nuevo || cart.length > 0;
  usePreventRemove(dirty, ({ data }) => {
    if (saved.current) { navigation.dispatch(data.action); return; }
    if (step > 0) { goTo(step - 1); return; }
    Alert.alert('¿Descartar el pedido?', 'Se perderán los datos que ingresaste.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  const back = () => navigation.goBack();

  const addServicio = (s: Servicio) => setCart((c) => {
    const existing = c.find((l) => l.servicio.id === s.id);
    if (existing) return c.map((l) => (l === existing ? { ...l, cantidad: String(round10((parseAmount(l.cantidad) || 0) + 1)) } : l));
    return [...c, { servicio: s, cantidad: '1', precio: s.precio.toFixed(2) }];
  });
  const updateLine = (id: number, patch: Partial<CartLine>) => setCart((c) => c.map((l) => (l.servicio.id === id ? { ...l, ...patch } : l)));
  const stepLine = (id: number, delta: number) => {
    const line = cart.find((l) => l.servicio.id === id);
    if (!line) return;
    const n = round10((parseAmount(line.cantidad) || 0) + delta);
    if (n <= 0) setCart((c) => c.filter((l) => l.servicio.id !== id)); else updateLine(id, { cantidad: String(n) });
  };
  const inCart = (id: number) => cart.some((l) => l.servicio.id === id);

  return (
    <Screen edges={['top']}>
      <StackHeader title="Nuevo pedido" close={step === 0} onBack={back} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Steps steps={STEPS} current={step} />

        {step === 0 && <View style={styles.stack}>
          {elegido ? <Card padded={false}>
            <ListItem title={elegido.nombre} subtitle={[elegido.celular, elegido.direccion].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
              leading={<Avatar name={elegido.nombre} tone="teal" />}
              trailing={<Button label="Cambiar" variant="ghost" size="sm" onPress={() => { setCliente(null); setUsePreset(false); }} />} />
          </Card> : usePreset && preset.isLoading ? <ActivityIndicator color={colors.primary} />
            : nuevo ? <View style={styles.stack}>
              <AppText variant="title">Cliente nuevo</AppText>
              <TextField label="Nombre completo" icon="person-outline" placeholder="Ej. María Torres" value={nombre} onChangeText={setNombre} autoCapitalize="words" maxLength={120} autoFocus />
              <TextField label="Celular / WhatsApp" optional icon="logo-whatsapp" placeholder="999 999 999" value={celular}
                onChangeText={(v) => setCelular(v.replace(/[^\d+\s]/g, ''))} keyboardType="phone-pad" maxLength={20}
                hint="Sirve para avisarle cuando su pedido esté listo." />
              <TextField label="Dirección" optional icon="location-outline" placeholder="Calle, número, distrito" value={direccion}
                onChangeText={setDireccion} autoCapitalize="sentences" maxLength={200} hint="Necesaria si harás recojo a domicilio." />
              <Button label="Buscar un cliente existente" variant="ghost" icon="search" onPress={() => setNuevo(false)} />
            </View> : <View style={styles.stack}>
              <AppText variant="title">¿Para quién es el pedido?</AppText>
              <SearchBar value={busqueda} onChangeText={setBusqueda} placeholder="Nombre, celular o DNI" autoFocus />
              {term.length < 2 ? <AppText variant="caption">Escribe al menos 2 letras o números para buscar.</AppText>
                : resultados.isFetching && !resultados.data ? <ActivityIndicator color={colors.primary} />
                  : resultados.data?.length ? <Card padded={false}>
                    {resultados.data.map((c, i) => <Fragment key={c.id}>
                      {i > 0 && <Divider inset={space.lg} />}
                      <ListItem title={c.nombre} subtitle={c.celular || 'Sin celular'} leading={<Avatar name={c.nombre} tone="teal" size={38} />}
                        onPress={() => setCliente(c)} trailing={<Ionicons name="add-circle" size={24} color={colors.primary} />} />
                    </Fragment>)}
                  </Card> : <EmptyState icon="person-outline" title="No lo encontramos" text="Regístralo como cliente nuevo; solo toma unos segundos." />}
              <Button label="Registrar cliente nuevo" icon="person-add-outline" variant="secondary"
                onPress={() => { setNuevo(true); if (!/^\+?\d+$/.test(busqueda.trim())) setNombre(busqueda.trim()); else setCelular(busqueda.trim()); }} />
            </View>}
        </View>}

        {step === 1 && <View style={styles.stack}>
          <AppText variant="title">¿Qué prendas trae?</AppText>
          {lines.length > 0 && <Card padded={false}>
            {lines.map((l, i) => <Fragment key={l.servicio.id}>
              {i > 0 && <Divider />}
              <View style={styles.line}>
                <View style={styles.lineTop}>
                  <AppText variant="subheading" style={styles.flex} numberOfLines={2}>{l.servicio.nombre}</AppText>
                  <AppText variant="subheading">{money(l.total)}</AppText>
                </View>
                <View style={styles.lineControls}>
                  <View style={styles.stepper}>
                    <Pressable onPress={() => stepLine(l.servicio.id, -1)} style={styles.stepBtn} accessibilityLabel="Restar uno">
                      <Ionicons name={parseAmount(l.cantidad) <= 1 ? 'trash-outline' : 'remove'} size={18} color={parseAmount(l.cantidad) <= 1 ? colors.danger : colors.text} />
                    </Pressable>
                    <TextInput value={l.cantidad} onChangeText={(v) => updateLine(l.servicio.id, { cantidad: v })} keyboardType="decimal-pad"
                      style={styles.qty} selectTextOnFocus accessibilityLabel="Cantidad" />
                    <Pressable onPress={() => stepLine(l.servicio.id, 1)} style={styles.stepBtn} accessibilityLabel="Sumar uno"><Ionicons name="add" size={18} color={colors.text} /></Pressable>
                  </View>
                  <AppText variant="caption">{l.servicio.unidad.toLowerCase()} × S/</AppText>
                  <TextInput value={l.precio} onChangeText={(v) => updateLine(l.servicio.id, { precio: v })} keyboardType="decimal-pad"
                    style={styles.price} selectTextOnFocus accessibilityLabel="Precio unitario" />
                </View>
              </View>
            </Fragment>)}
          </Card>}
          <Section title="Catálogo de servicios" style={styles.noTop}>
            <SearchBar value={busquedaServicio} onChangeText={setBusquedaServicio} placeholder="Buscar servicio" />
            <View style={styles.grid}>
              {servicios.isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} />
                : servicios.isError ? <InlineAlert text="No se pudo cargar el catálogo de servicios." />
                  : catalogo.map((s) => {
                    const added = inCart(s.id);
                    return (
                      <Pressable key={s.id} onPress={() => addServicio(s)} accessibilityRole="button" accessibilityLabel={`Agregar ${s.nombre}`}
                        style={({ pressed }) => [styles.service, added && styles.serviceAdded, pressed && styles.pressed]}>
                        <AppText variant="captionStrong" color={colors.text} numberOfLines={2}>{s.nombre}</AppText>
                        <View style={styles.serviceBottom}>
                          <AppText style={styles.servicePrice}>{money(s.precio)}<AppText variant="caption"> /{s.unidad.toLowerCase()}</AppText></AppText>
                          <Ionicons name={added ? 'checkmark-circle' : 'add-circle-outline'} size={20} color={added ? colors.success : colors.primary} />
                        </View>
                      </Pressable>
                    );
                  })}
            </View>
          </Section>
        </View>}

        {step === 2 && <View style={styles.stack}>
          <AppText variant="title">Entrega y pago</AppText>
          <Group label="¿Cómo se entrega?">
            <Choice label="Recoge en tienda" icon="storefront-outline" selected={modalidad === 'Tienda'} onPress={() => setModalidad('Tienda')} />
            <Choice label="Recojo a domicilio" icon="bicycle-outline" selected={modalidad === 'Recojo'} onPress={() => setModalidad('Recojo')} />
          </Group>
          {modalidad === 'Recojo' && <InlineAlert tone={direccionCliente ? 'info' : 'warning'}
            text={direccionCliente ? `Dirección: ${direccionCliente}. LunaLav sumará la tarifa de domicilio de tu negocio.` : 'Este cliente no tiene dirección. Vuelve al paso 1 para agregarla o elige «Recoge en tienda».'} />}
          <Group label="¿Para cuándo?">
            {deliveryOptions.map((o) => <Choice key={o.days} label={o.label} selected={entregaDias === o.days} onPress={() => setEntregaDias(o.days)} />)}
            <Choice label="Sin fecha" selected={entregaDias == null} onPress={() => setEntregaDias(null)} />
          </Group>
          <Card style={styles.urgent}>
            <View style={styles.flex}>
              <AppText variant="subheading">Pedido urgente</AppText>
              <AppText variant="caption">Se prioriza y suma {URGENT_PCT}% al subtotal</AppText>
            </View>
            <Switch value={urgente} onValueChange={setUrgente} trackColor={{ true: colors.danger, false: colors.borderStrong }} accessibilityLabel="Pedido urgente" />
          </Card>
          <TextField label="Observaciones" optional icon="chatbox-ellipses-outline" placeholder="Manchas, prendas delicadas, botones faltantes…"
            value={observaciones} onChangeText={setObservaciones} autoCapitalize="sentences" maxLength={500} multiline />

          <Card>
            <Row label={`Subtotal · ${prendas} ${prendas === 1 ? 'unidad' : 'unidades'}`} value={money(subtotal)} />
            {urgente && <Row label={`Recargo urgente (${URGENT_PCT}%)`} value={money(recargo)} />}
            <Divider />
            <Row label="Total" value={money(total)} strong />
          </Card>
          <TextField label="Adelanto" optional prefix="S/" placeholder="0.00" value={adelanto} onChangeText={setAdelanto} keyboardType="decimal-pad"
            right={<Pressable onPress={() => setAdelanto(total.toFixed(2))} hitSlop={8}><AppText variant="captionStrong" color={colors.primary}>Pago total</AppText></Pressable>}
            hint={adelantoNum > 0 ? `Saldo al entregar: ${money(Math.max(0, total - adelantoNum))}` : 'Si no cobras ahora, queda todo por cobrar al entregar.'} />
          {adelantoNum > 0 && <Group label="¿Cómo pagó?">
            {METODOS_PAGO.map((m) => <Choice key={m} label={methodLabel(m)} selected={metodo === m} onPress={() => setMetodo(m)} />)}
          </Group>}
          {save.isError && <InlineAlert title="No se pudo registrar el pedido" text={apiErrorMessage(save.error)} />}
        </View>}

        {attempted[step] && !!errors[step] && <View style={styles.error}><InlineAlert tone="warning" text={errors[step]} /></View>}
      </ScrollView>

      <BottomBar>
        <View style={styles.bar}>
          <View style={styles.flex}>
            <AppText variant="caption">{step === 0 ? 'Cliente' : `${lines.length} ${lines.length === 1 ? 'servicio' : 'servicios'} · ${step === 2 ? 'total' : 'subtotal'}`}</AppText>
            <AppText style={styles.barTotal} numberOfLines={1}>{step === 0 ? (elegido?.nombre ?? (nuevo ? nombre || 'Cliente nuevo' : 'Elige un cliente')) : money(step === 2 ? total : subtotal)}</AppText>
          </View>
          <Button label={step === STEPS.length - 1 ? 'Registrar pedido' : 'Continuar'} iconRight={step === STEPS.length - 1 ? 'checkmark' : 'arrow-forward'}
            onPress={next} busy={save.isPending} style={styles.barButton} />
        </View>
      </BottomBar>
    </Screen>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <View><AppText variant="captionStrong" color={colors.text} style={styles.groupLabel}>{label}</AppText><View style={styles.choices}>{children}</View></View>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.row}><AppText variant={strong ? 'subheading' : 'caption'}>{label}</AppText><AppText variant={strong ? 'title' : 'captionStrong'} color={colors.text}>{value}</AppText></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl, gap: space.xl },
  stack: { gap: space.lg },
  noTop: { marginTop: 0 },
  line: { padding: space.lg, gap: space.md },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  lineControls: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qty: { width: 52, textAlign: 'center', color: colors.text, fontFamily: fonts.bold, fontSize: 16, paddingVertical: 6 },
  price: { width: 76, borderBottomWidth: 1.5, borderBottomColor: colors.borderStrong, color: colors.text, fontFamily: fonts.semibold, fontSize: 15, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  loader: { marginVertical: space.xl, flex: 1 },
  service: { width: '48.5%', minHeight: 84, justifyContent: 'space-between', padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  serviceAdded: { borderColor: colors.success, backgroundColor: '#F4FBF7' },
  serviceBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  servicePrice: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  pressed: { opacity: 0.8 },
  groupLabel: { marginBottom: space.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  urgent: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  error: { marginTop: -space.sm },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  barTotal: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  barButton: { minWidth: 170 },
});
