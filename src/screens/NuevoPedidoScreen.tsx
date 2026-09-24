import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiErrorMessage } from '../api/errors';
import {
  crearPedido, getCliente, getClientes, getServicios, METODOS_PAGO,
  type Cliente, type CrearPedidoPayload, type MetodoPago, type Modalidad, type Servicio,
} from '../api/operationsApi';
import { Field } from '../components/Field';
import { Button, Card, Chip, ErrorBox, ScreenTitle, SearchBar, SectionLabel } from '../components/ui';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { methodLabel, money, parseAmount } from '../utils/format';
import { validateCliente } from './ClienteFormScreen';

interface CartLine { servicio: Servicio; cantidad: string; precio: string }

const URGENT_PCT = 20;
const deliveryOptions = [
  { days: 0, label: 'Hoy' }, { days: 1, label: 'Mañana' }, { days: 2, label: 'En 2 días' }, { days: 3, label: 'En 3 días' },
];

/** Fecha de entrega a las 6 p. m. del día elegido, en hora local, sin zona (como la envía la web). */
function deliveryDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T18:00:00`;
}

const round10 = (value: number) => Math.round(value * 10) / 10;

export function NuevoPedidoScreen({ navigation, route }: AppScreenProps<'NuevoPedido'>) {
  const negocioId = useAuthStore((state) => state.session?.usuario.negocioId);
  const queryClient = useQueryClient();
  const presetClienteId = route.params?.clienteId;

  // Cliente
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [direccion, setDireccion] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const termCliente = useDebouncedValue(busquedaCliente.trim());
  const preset = useQuery({ queryKey: ['cliente', presetClienteId], queryFn: () => getCliente(presetClienteId!), enabled: !!presetClienteId });
  const clienteElegido = cliente ?? (presetClienteId ? preset.data ?? null : null);
  const clientes = useQuery({
    queryKey: ['clientes', negocioId, termCliente], queryFn: () => getClientes(termCliente),
    enabled: !clienteElegido && !nuevoCliente && termCliente.length >= 2,
  });

  // Servicios
  const servicios = useQuery({ queryKey: ['servicios', negocioId], queryFn: getServicios, staleTime: 5 * 60_000 });
  const [busquedaServicio, setBusquedaServicio] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  // Condiciones
  const [modalidad, setModalidad] = useState<Modalidad>('Tienda');
  const [entregaDias, setEntregaDias] = useState<number | null>(1);
  const [urgente, setUrgente] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [adelanto, setAdelanto] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [formError, setFormError] = useState('');

  const serviciosFiltrados = useMemo(() => {
    const term = busquedaServicio.trim().toLowerCase();
    const list = servicios.data ?? [];
    return (term ? list.filter((s) => s.nombre.toLowerCase().includes(term)) : list).slice(0, term ? 30 : 12);
  }, [servicios.data, busquedaServicio]);

  const lines = cart.map((line) => {
    const cantidad = parseAmount(line.cantidad);
    const precio = parseAmount(line.precio);
    return { ...line, cantidadNum: cantidad, precioNum: precio, total: Number.isFinite(cantidad * precio) ? cantidad * precio : 0 };
  });
  const subtotal = lines.reduce((acc, line) => acc + line.total, 0);
  const recargo = urgente ? Math.round(subtotal * URGENT_PCT) / 100 : 0;
  const totalEstimado = round10(subtotal + recargo);
  const adelantoNum = adelanto.trim() ? parseAmount(adelanto) : 0;

  const addServicio = (servicio: Servicio) => {
    setCart((current) => {
      const existing = current.find((line) => line.servicio.id === servicio.id);
      if (existing) return current.map((line) => line === existing ? { ...line, cantidad: String(round10((parseAmount(line.cantidad) || 0) + 1)) } : line);
      return [...current, { servicio, cantidad: '1', precio: servicio.precio.toFixed(2) }];
    });
  };
  const updateLine = (id: number, patch: Partial<CartLine>) =>
    setCart((current) => current.map((line) => line.servicio.id === id ? { ...line, ...patch } : line));
  const removeLine = (id: number) => setCart((current) => current.filter((line) => line.servicio.id !== id));
  const stepLine = (id: number, delta: number) => {
    const line = cart.find((l) => l.servicio.id === id);
    if (!line) return;
    const next = round10((parseAmount(line.cantidad) || 0) + delta);
    if (next <= 0) removeLine(id); else updateLine(id, { cantidad: String(next) });
  };

  function validate(): string {
    if (!clienteElegido && !nuevoCliente) return 'Elige un cliente o registra uno nuevo.';
    if (nuevoCliente) {
      const error = validateCliente({ nombre, celular, dni: '', ruc: '' });
      if (error) return error;
    }
    if (!lines.length) return 'Agrega al menos un servicio.';
    if (lines.some((l) => !(l.cantidadNum > 0) || l.cantidadNum > 10_000)) return 'Revisa las cantidades: deben ser mayores a 0.';
    if (lines.some((l) => !(l.precioNum > 0) || l.precioNum > 10_000)) return 'Revisa los precios: deben ser mayores a 0.';
    const direccionCliente = nuevoCliente ? direccion.trim() : clienteElegido?.direccion?.trim();
    if (modalidad === 'Recojo' && !direccionCliente) return 'Para un recojo a domicilio el cliente necesita una dirección.';
    if (!Number.isFinite(adelantoNum) || adelantoNum < 0) return 'El adelanto no es un monto válido.';
    if (modalidad === 'Tienda' && adelantoNum > totalEstimado + 0.01) return `El adelanto no puede superar el total (${money(totalEstimado)}).`;
    return '';
  }

  const save = useMutation({
    mutationFn: () => {
      const payload: CrearPedidoPayload = {
        clienteId: nuevoCliente ? undefined : clienteElegido?.id,
        clienteNuevo: nuevoCliente
          ? { nombre: nombre.trim(), celular: celular.trim() || null, direccion: direccion.trim() || null }
          : undefined,
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
      navigation.replace('PedidoDetalle', { id: pedido.id });
    },
  });

  const submit = () => {
    const error = validate();
    setFormError(error);
    if (!error) save.mutate();
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenTitle kicker="REGISTRAR" title="Nuevo pedido" onBack={navigation.goBack} />

        <SectionLabel>1. Cliente</SectionLabel>
        {clienteElegido ? <Card style={styles.selected}>
          <Ionicons name="person-circle-outline" size={30} color={colors.primary} />
          <View style={styles.flex}>
            <Text style={styles.strong}>{clienteElegido.nombre}</Text>
            <Text style={styles.meta}>{clienteElegido.celular || 'Sin celular'}{clienteElegido.direccion ? ` · ${clienteElegido.direccion}` : ''}</Text>
          </View>
          <Pressable onPress={() => { setCliente(null); navigation.setParams({ clienteId: undefined }); }} hitSlop={10}>
            <Text style={styles.link}>Cambiar</Text>
          </Pressable>
        </Card> : presetClienteId && preset.isLoading ? <ActivityIndicator color={colors.primary} /> : nuevoCliente ? <View style={styles.gap}>
          <Field label="Nombre" icon="person-outline" placeholder="Nombre del cliente" value={nombre} onChangeText={setNombre} autoCapitalize="words" maxLength={120} />
          <Field label="Celular (opcional)" icon="call-outline" placeholder="999 999 999" value={celular} onChangeText={(v) => setCelular(v.replace(/[^\d+]/g, ''))} keyboardType="phone-pad" maxLength={21} />
          <Field label={modalidad === 'Recojo' ? 'Dirección' : 'Dirección (opcional)'} icon="location-outline" placeholder="Calle, número, distrito" value={direccion} onChangeText={setDireccion} autoCapitalize="sentences" maxLength={200} />
          <Pressable onPress={() => setNuevoCliente(false)}><Text style={styles.link}>Buscar un cliente existente</Text></Pressable>
        </View> : <View>
          <SearchBar value={busquedaCliente} onChangeText={setBusquedaCliente} placeholder="Busca por nombre, celular o DNI..." />
          {clientes.isFetching && <ActivityIndicator color={colors.primary} />}
          {clientes.data?.slice(0, 6).map((c) => <Card key={c.id} onPress={() => setCliente(c)} style={styles.selected}>
            <Ionicons name="person-outline" size={20} color={colors.success} />
            <View style={styles.flex}><Text style={styles.strong}>{c.nombre}</Text><Text style={styles.meta}>{c.celular || 'Sin celular'}</Text></View>
            <Ionicons name="add-circle" size={22} color={colors.primary} />
          </Card>)}
          {termCliente.length >= 2 && clientes.isSuccess && !clientes.data.length && <Text style={styles.meta}>No encontramos ese cliente.</Text>}
          <Button label="Cliente nuevo" icon="person-add-outline" variant="secondary" style={styles.top}
            onPress={() => { setNuevoCliente(true); setNombre(busquedaCliente.trim().replace(/^\d+$/, '')); }} />
        </View>}

        <SectionLabel>2. Servicios</SectionLabel>
        {lines.map((line) => <Card key={line.servicio.id}>
          <View style={styles.rowBetween}>
            <Text style={[styles.strong, styles.flex]}>{line.servicio.nombre}</Text>
            <Pressable onPress={() => removeLine(line.servicio.id)} hitSlop={10} accessibilityLabel="Quitar servicio"><Ionicons name="trash-outline" size={19} color={colors.danger} /></Pressable>
          </View>
          <View style={styles.lineControls}>
            <View style={styles.stepper}>
              <Pressable onPress={() => stepLine(line.servicio.id, -1)} style={styles.stepButton} accessibilityLabel="Restar"><Ionicons name="remove" size={18} color={colors.navy} /></Pressable>
              <TextInput value={line.cantidad} onChangeText={(v) => updateLine(line.servicio.id, { cantidad: v })} keyboardType="decimal-pad" style={styles.qty} selectTextOnFocus />
              <Pressable onPress={() => stepLine(line.servicio.id, 1)} style={styles.stepButton} accessibilityLabel="Sumar"><Ionicons name="add" size={18} color={colors.navy} /></Pressable>
            </View>
            <Text style={styles.meta}>{line.servicio.unidad.toLowerCase()} × S/</Text>
            <TextInput value={line.precio} onChangeText={(v) => updateLine(line.servicio.id, { precio: v })} keyboardType="decimal-pad" style={styles.price} selectTextOnFocus />
            <Text style={[styles.strong, styles.lineTotal]}>{money(line.total)}</Text>
          </View>
        </Card>)}
        <SearchBar value={busquedaServicio} onChangeText={setBusquedaServicio} placeholder="Buscar servicio del catálogo..." />
        {servicios.isLoading ? <ActivityIndicator color={colors.primary} /> : servicios.isError
          ? <ErrorBox message="No se pudo cargar el catálogo de servicios." />
          : <View style={styles.serviceGrid}>{serviciosFiltrados.map((s) => <Pressable key={s.id} onPress={() => addServicio(s)} style={({ pressed }) => [styles.service, pressed && styles.pressed]}>
            <Text style={styles.serviceName} numberOfLines={2}>{s.nombre}</Text>
            <Text style={styles.servicePrice}>{money(s.precio)} / {s.unidad.toLowerCase()}</Text>
          </Pressable>)}</View>}

        <SectionLabel>3. Entrega</SectionLabel>
        <View style={styles.chips}>
          <Chip label="En tienda" active={modalidad === 'Tienda'} onPress={() => setModalidad('Tienda')} />
          <Chip label="Recojo a domicilio" active={modalidad === 'Recojo'} onPress={() => setModalidad('Recojo')} />
        </View>
        <View style={[styles.chips, styles.top]}>
          {deliveryOptions.map((o) => <Chip key={o.days} label={o.label} active={entregaDias === o.days} onPress={() => setEntregaDias(o.days)} color={colors.navy} />)}
          <Chip label="Sin fecha" active={entregaDias == null} onPress={() => setEntregaDias(null)} color={colors.navy} />
        </View>
        <View style={[styles.rowBetween, styles.toggle]}>
          <View style={styles.flex}><Text style={styles.strong}>Pedido urgente</Text><Text style={styles.meta}>Recargo de {URGENT_PCT}% sobre el subtotal</Text></View>
          <Switch value={urgente} onValueChange={setUrgente} trackColor={{ true: colors.danger, false: '#CBD8E4' }} />
        </View>
        <View style={styles.top}>
          <Field label="Observaciones (opcional)" icon="chatbox-ellipses-outline" placeholder="Manchas, prendas delicadas, indicaciones..." value={observaciones} onChangeText={setObservaciones} autoCapitalize="sentences" maxLength={500} multiline />
        </View>

        <SectionLabel>4. Pago</SectionLabel>
        <Card>
          <Row label="Subtotal" value={money(subtotal)} />
          {urgente && <Row label={`Recargo urgente (${URGENT_PCT}%)`} value={money(recargo)} />}
          <Row label="Total estimado" value={money(totalEstimado)} strong />
          {modalidad === 'Recojo' && <Text style={styles.meta}>LunaLav sumará la tarifa de domicilio configurada por tu negocio.</Text>}
        </Card>
        <View style={styles.amountField}>
          <Text style={styles.meta}>Adelanto S/</Text>
          <TextInput value={adelanto} onChangeText={setAdelanto} placeholder="0.00" placeholderTextColor="#B5C5D3" keyboardType="decimal-pad" style={styles.amountInput} />
          <Pressable onPress={() => setAdelanto(totalEstimado.toFixed(2))} hitSlop={8}><Text style={styles.link}>Pago total</Text></Pressable>
        </View>
        {adelantoNum > 0 && <View style={[styles.chips, styles.top]}>
          {METODOS_PAGO.map((m) => <Chip key={m} label={methodLabel(m)} active={metodo === m} onPress={() => setMetodo(m)} color={colors.success} />)}
        </View>}

        {!!formError && <View style={styles.top}><ErrorBox message={formError} /></View>}
        {save.isError && <View style={styles.top}><ErrorBox message={apiErrorMessage(save.error)} /></View>}
        <Button label="Registrar pedido" icon="checkmark-circle-outline" onPress={submit} busy={save.isPending} style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <View style={[styles.rowBetween, styles.row]}>
    <Text style={strong ? styles.strong : styles.meta}>{label}</Text>
    <Text style={strong ? styles.total : styles.strong}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  gap: { gap: 14 },
  top: { marginTop: 10 },
  selected: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  strong: { color: colors.text, fontWeight: '800', fontSize: 14 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  link: { color: colors.primary, fontWeight: '900', fontSize: 13 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  row: { paddingVertical: 3 },
  lineControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  stepButton: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 40, textAlign: 'center', color: colors.navy, fontWeight: '900', fontSize: 15, paddingVertical: 4 },
  price: { minWidth: 58, borderBottomWidth: 1, borderBottomColor: colors.border, color: colors.navy, fontWeight: '800', fontSize: 14, paddingVertical: 4 },
  lineTotal: { marginLeft: 'auto' },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  service: { width: '48.5%', minHeight: 70, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 11, justifyContent: 'space-between' },
  serviceName: { color: colors.navy, fontWeight: '800', fontSize: 13 },
  servicePrice: { color: colors.primary, fontWeight: '800', fontSize: 11, marginTop: 6 },
  pressed: { opacity: 0.75 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggle: { marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13 },
  total: { color: colors.navy, fontWeight: '900', fontSize: 18 },
  amountField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 58 },
  amountInput: { flex: 1, color: colors.success, fontSize: 22, fontWeight: '900' },
  submit: { marginTop: 22 },
});
