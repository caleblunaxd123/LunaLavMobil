import { Ionicons } from '@expo/vector-icons';
import { usePreventRemove } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { apiErrorMessage } from '../api/errors';
import {
  crearPedido, esDomicilio, getCliente, getClientes, getServicios, METODOS_PAGO,
  type Cliente, type CrearPedidoPayload, type MetodoPago, type Modalidad, type Pedido, type Servicio,
} from '../api/operationsApi';
import {
  getAreasLavado, getPlantillasWhatsapp, linkSeguimiento, subirFoto, validarPromocion, type PromocionValida,
} from '../api/pedidoApi';
import { destinoError, destinoVacio, LocationPicker, type Destino } from '../components/delivery/LocationPicker';
import { FotosPicker } from '../components/pedido/FotosPicker';
import { NuevoServicioSheet } from '../components/pedido/NuevoServicioSheet';
import {
  AppText, Avatar, Badge, BottomBar, Button, Card, Choice, DateTimeField, defaultPickupDate, Divider, EmptyState, InlineAlert,
  ListItem, Screen, SearchBar, Section, StackHeader, Steps, TextField, toast,
} from '../components/ui';
import { normalizeText } from '../constants/distritos';
import { useConfiguracion } from '../hooks/useConfiguracion';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, fonts, radius, space } from '../theme';
import { methodLabel, money, parseAmount, roundMoney } from '../utils/format';
import { celularValido } from '../utils/validation';
import { usePublicUrl } from '../utils/web';
import { abrirWhatsapp, mensajeIngreso } from '../utils/whatsapp';

/** Una línea del pedido. En servicios por m² la cantidad es el área (ancho × largo × piezas). */
interface CartLine {
  servicio: Servicio;
  cantidad: string;
  precio: string;
  nota: string;
  ancho?: string;
  largo?: string;
  piezas?: string;
}

const STEPS = ['Cliente', 'Prendas', 'Entrega', 'Pago'];

const MODALIDADES: { value: Modalidad; title: string; text: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'Tienda', title: 'En tienda', text: 'El cliente deja y recoge sus prendas en el local.', icon: 'storefront-outline' },
  { value: 'Recojo', title: 'Recojo a domicilio', text: 'Pasamos a recoger las prendas a la casa del cliente.', icon: 'home-outline' },
  { value: 'Delivery', title: 'Delivery', text: 'Entregamos el pedido listo en una dirección con punto en el mapa.', icon: 'bicycle-outline' },
];

/** ¿La unidad del servicio se cobra por metro cuadrado? (m2, m², mt2…), igual que la web. */
export const esUnidadM2 = (u?: string | null) => (u ?? '').trim().toLowerCase().replace('²', '2').replace(/\s+/g, '') === 'm2';
const roundTenth = (value: number) => Math.round(value * 10) / 10;
const area = (ancho?: string, largo?: string, piezas?: string) => {
  const a = Math.max(0, parseAmount(ancho ?? '') || 0);
  const l = Math.max(0, parseAmount(largo ?? '') || 0);
  const n = Math.max(1, Math.floor(parseAmount(piezas ?? '') || 1));
  return Math.round(a * l * n * 100) / 100;
};

export function NuevoPedidoScreen({ navigation, route }: AppScreenProps<'NuevoPedido'>) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const queryClient = useQueryClient();
  const publicUrl = usePublicUrl();
  const config = useConfiguracion();
  const cfg = config.data;
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
  const [dni, setDni] = useState('');
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
  const [nuevoServicio, setNuevoServicio] = useState(false);

  // Paso 3 — entrega
  const [modalidad, setModalidad] = useState<Modalidad>('Tienda');
  const [destino, setDestino] = useState<Destino>(destinoVacio());
  const [costoDelivery, setCostoDelivery] = useState<string | null>(null);
  const [fechaEntrega, setFechaEntrega] = useState<string | null>(() => defaultPickupDate());
  const areas = useQuery({ queryKey: ['areas-lavado', negocioId], queryFn: getAreasLavado, staleTime: 10 * 60_000 });
  const [areaId, setAreaId] = useState<number | null>(null);

  // Paso 4 — pago y extras
  const [aplicaDescuento, setAplicaDescuento] = useState(false);
  const [descuentoPct, setDescuentoPct] = useState('10');
  const [codigoPromo, setCodigoPromo] = useState('');
  const [promo, setPromo] = useState<PromocionValida | null>(null);
  const [promoError, setPromoError] = useState('');
  const [validandoPromo, setValidandoPromo] = useState(false);
  const [puntos, setPuntos] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [recargoPct, setRecargoPct] = useState('20');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [adelanto, setAdelanto] = useState('');
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [avisarWhatsapp, setAvisarWhatsapp] = useState(true);

  // El cargo de domicilio es un servicio de sistema: no se muestra en el catálogo.
  const catalogoCompleto = useMemo(
    () => (servicios.data ?? []).filter((s) => s.id !== cfg?.servicioDeliveryId), [servicios.data, cfg?.servicioDeliveryId]);
  const catalogo = useMemo(() => {
    const t = normalizeText(busquedaServicio);
    return (t ? catalogoCompleto.filter((s) => normalizeText(s.nombre).includes(t)) : catalogoCompleto).slice(0, t ? 40 : 12);
  }, [catalogoCompleto, busquedaServicio]);

  // ---------- Cálculos (mismas reglas que la web y el backend) ----------
  const lines = cart.map((l) => {
    const m2 = esUnidadM2(l.servicio.unidad);
    const cantidad = m2 ? area(l.ancho, l.largo, l.piezas) : parseAmount(l.cantidad);
    const precio = parseAmount(l.precio);
    return { ...l, m2, cantidadNum: cantidad, precioNum: precio, total: Number.isFinite(cantidad * precio) ? Math.round(cantidad * precio * 100) / 100 : 0 };
  });
  const domicilio = esDomicilio(modalidad);
  const costoDeliveryNum = domicilio ? Math.max(0, Math.min(10_000, parseAmount(costoDelivery ?? String(cfg?.costoDelivery ?? 0)) || 0)) : 0;
  const itemsSubtotal = lines.reduce((acc, l) => acc + l.total, 0);
  const subtotal = itemsSubtotal + costoDeliveryNum;
  const maxDesc = cfg?.maxDescuentoPct ?? 0;
  const pctDesc = aplicaDescuento ? Math.max(0, Math.min(100, maxDesc > 0 ? Math.min(maxDesc, parseAmount(descuentoPct) || 0) : parseAmount(descuentoPct) || 0)) : 0;
  const descuento = Math.round(subtotal * pctDesc) / 100;
  const puntosDisponibles = nuevo ? 0 : elegido?.puntos ?? 0;
  const valorPunto = cfg?.valorPuntoCanje ?? 0;
  const maxPuntos = valorPunto > 0 ? Math.min(puntosDisponibles, Math.floor(Math.max(0, subtotal - descuento) / valorPunto)) : 0;
  const puntosNum = Math.max(0, Math.min(maxPuntos, Math.floor(parseAmount(puntos) || 0)));
  const descuentoPuntos = Math.round(puntosNum * valorPunto * 100) / 100;
  const pctUrg = Math.max(0, Math.min(100, parseAmount(recargoPct) || 0));
  const recargo = urgente ? Math.round(subtotal * pctUrg) / 100 : 0;
  const total = roundMoney(Math.max(0, subtotal - descuento - descuentoPuntos + recargo));
  const adelantoNum = adelanto.trim() ? parseAmount(adelanto) : 0;
  const prendas = lines.reduce((acc, l) => acc + (l.m2 ? Math.max(1, Math.floor(parseAmount(l.piezas ?? '1') || 1)) : Number.isFinite(l.cantidadNum) ? l.cantidadNum : 0), 0);
  const direccionCliente = nuevo ? direccion.trim() : elegido?.direccion?.trim() ?? '';
  const celularCliente = nuevo ? celular.replace(/\s/g, '') : elegido?.celular ?? '';

  const errors: Record<number, string> = {
    0: !elegido && !nuevo ? 'Busca y elige un cliente, o registra uno nuevo.'
      : nuevo && nombre.trim().length < 2 ? 'Escribe el nombre del cliente.'
        : nuevo && celular.trim() && !celularValido(celular) ? 'El celular solo admite números.'
          : nuevo && dni.trim() && !/^\d{8}$/.test(dni.trim()) ? 'El DNI tiene 8 dígitos.' : '',
    1: !lines.length ? 'Agrega al menos un servicio del catálogo (o crea uno nuevo).'
      : lines.some((l) => l.m2 && !(l.cantidadNum > 0)) ? 'Indica el ancho y el largo de los servicios por m².'
        : lines.some((l) => !(l.cantidadNum > 0) || l.cantidadNum > 10_000) ? 'Revisa las cantidades: deben ser mayores a 0.'
          : lines.some((l) => !(l.precioNum > 0) || l.precioNum > 10_000) ? 'Revisa los precios: deben ser mayores a 0.' : '',
    2: modalidad === 'Recojo' && !direccionCliente ? 'Para un recojo a domicilio el cliente necesita una dirección (vuelve al paso 1).'
      : modalidad === 'Delivery' ? destinoError(destino)
        : !fechaEntrega ? 'Elige la fecha y hora estimada.' : '',
    3: !Number.isFinite(adelantoNum) || adelantoNum < 0 ? 'El adelanto no es un monto válido.'
      : adelantoNum > total + 0.01 ? `El adelanto no puede superar el total (${money(total)}).`
        : total <= 0 ? 'El total del pedido debe ser mayor a cero.' : '',
  };

  const aplicarPromo = async () => {
    const codigo = codigoPromo.trim().toUpperCase();
    if (!codigo) return;
    setValidandoPromo(true); setPromoError('');
    try {
      const p = await validarPromocion(codigo, nuevo ? undefined : elegido?.id);
      const aplicable = p.servicioId ? lines.filter((l) => l.servicio.id === p.servicioId).reduce((a, l) => a + l.cantidadNum, 0) : prendas;
      if (aplicable < p.cantidadMinima) { setPromoError(`Esta promoción requiere una cantidad mínima de ${p.cantidadMinima}.`); return; }
      setPromo(p);
      setAplicaDescuento(true);
      if (p.descuentoPct) setDescuentoPct(String(p.descuentoPct));
      else if (p.descuentoMonto && subtotal > 0) setDescuentoPct(String(Math.min(100, Math.round((p.descuentoMonto / subtotal) * 10000) / 100)));
      toast(`Promoción aplicada: ${p.descripcion}`);
    } catch (e) {
      setPromoError(apiErrorMessage(e, 'Código no válido.'));
    } finally {
      setValidandoPromo(false);
    }
  };
  const quitarPromo = () => { setPromo(null); setCodigoPromo(''); setPromoError(''); setAplicaDescuento(false); setDescuentoPct('10'); };

  const save = useMutation({
    mutationFn: () => {
      const payload: CrearPedidoPayload = {
        clienteId: nuevo ? undefined : elegido?.id,
        clienteNuevo: nuevo
          ? { nombre: nombre.trim(), celular: celular.replace(/\s/g, '') || null, direccion: direccion.trim() || null, dni: dni.trim() || null, documentoFiscal: null }
          : undefined,
        modalidad,
        direccionEntrega: modalidad === 'Delivery' ? destino.direccion.trim() : null,
        distritoEntrega: modalidad === 'Delivery' ? destino.distrito : null,
        referenciaEntrega: modalidad === 'Delivery' ? destino.referencia.trim() || null : null,
        latitudEntrega: modalidad === 'Delivery' ? destino.latitud : null,
        longitudEntrega: modalidad === 'Delivery' ? destino.longitud : null,
        items: lines.map((l) => {
          const nota = l.nota.trim();
          // En m² la medida se antepone a la nota, igual que la web: queda en el ticket y el detalle.
          const medida = l.m2 ? `${(parseAmount(l.ancho ?? '') || 0).toFixed(2)} × ${(parseAmount(l.largo ?? '') || 0).toFixed(2)} m`
            + ((parseAmount(l.piezas ?? '') || 1) > 1 ? ` · ${Math.floor(parseAmount(l.piezas ?? ''))} piezas` : '') : '';
          return { servicioId: l.servicio.id, cantidad: l.cantidadNum, precioUnit: l.precioNum, descripcion: [medida, nota].filter(Boolean).join(' · ') || null };
        }),
        descuentoPct: pctDesc,
        codigoPromocion: promo ? codigoPromo.trim().toUpperCase() : null,
        puntosACanjear: puntosNum > 0 ? puntosNum : null,
        esUrgente: urgente,
        recargoUrgentePct: pctUrg,
        costoDelivery: domicilio ? costoDeliveryNum : null,
        montoPagado: adelantoNum,
        metodoPagoInicial: metodo,
        fechaEntregaEst: fechaEntrega ?? undefined,
        observaciones: observaciones.trim() || undefined,
        areaInicialId: areaId ?? areas.data?.[0]?.id ?? null,
      };
      return crearPedido(payload);
    },
    onSuccess: async (pedido) => {
      saved.current = true;
      await Promise.all(['pedidos', 'dashboard', 'caja', 'clientes'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      toast(`Pedido #${pedido.numero} registrado`);
      void subirFotos(pedido.id);
      if (avisarWhatsapp && pedido.clienteCelular) void enviarIngreso(pedido);
      navigation.replace('PedidoDetalle', { id: pedido.id });
    },
  });

  // Las fotos no bloquean: el pedido ya existe y se pueden agregar luego desde el detalle.
  const subirFotos = async (pedidoId: number) => {
    if (!fotos.length) return;
    const results = await Promise.allSettled(fotos.map((u) => subirFoto(pedidoId, u, 'RECEPCION')));
    const fallidas = results.filter((r) => r.status === 'rejected').length;
    await queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId, 'fotos'] });
    toast(fallidas ? `${fallidas} foto(s) no se subieron; agrégalas desde el detalle.` : `${fotos.length} foto(s) guardadas`, fallidas ? 'error' : 'success');
  };

  const enviarIngreso = async (p: Pedido) => {
    try {
      const [plantillas, token] = await Promise.all([
        getPlantillasWhatsapp().catch(() => []),
        esDomicilio(p.modalidad) ? linkSeguimiento(p.id).catch(() => null) : Promise.resolve(null),
      ]);
      await abrirWhatsapp(p.clienteCelular!, mensajeIngreso(p, cfg, plantillas, token ? publicUrl(`seguimiento/${token}`) : undefined));
    } catch { /* WhatsApp no instalado: el pedido igual quedó registrado */ }
  };

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
    if (existing) {
      return c.map((l) => {
        if (l !== existing) return l;
        // m²: agregar de nuevo suma una pieza del mismo tamaño.
        if (esUnidadM2(l.servicio.unidad)) return { ...l, piezas: String((Math.floor(parseAmount(l.piezas ?? '1')) || 1) + 1) };
        return { ...l, cantidad: String(roundTenth((parseAmount(l.cantidad) || 0) + 1)) };
      });
    }
    return [...c, {
      servicio: s, cantidad: '1', precio: s.precio.toFixed(2), nota: '',
      ...(esUnidadM2(s.unidad) ? { ancho: '1', largo: '1', piezas: '1' } : {}),
    }];
  });
  const updateLine = (id: number, patch: Partial<CartLine>) => setCart((c) => c.map((l) => (l.servicio.id === id ? { ...l, ...patch } : l)));
  const removeLine = (id: number) => setCart((c) => c.filter((l) => l.servicio.id !== id));
  const stepLine = (id: number, delta: number) => {
    const line = cart.find((l) => l.servicio.id === id);
    if (!line) return;
    const n = roundTenth((parseAmount(line.cantidad) || 0) + delta);
    if (n <= 0) removeLine(id); else updateLine(id, { cantidad: String(n) });
  };
  const inCart = (id: number) => cart.some((l) => l.servicio.id === id);

  const cambiarModalidad = (m: Modalidad) => {
    setModalidad(m);
    // Igual que la web: al pasar a Delivery se propone la dirección del cliente.
    if (m === 'Delivery' && !destino.direccion.trim() && direccionCliente) setDestino({ ...destino, direccion: direccionCliente });
  };

  const fechaLabel = modalidad === 'Delivery' ? 'Fecha y hora de entrega' : modalidad === 'Recojo' ? 'Fecha y hora estimada' : 'Listo para recoger';
  const barCaption = step === 0 ? 'Cliente' : `${lines.length} ${lines.length === 1 ? 'servicio' : 'servicios'} · ${step === 3 ? 'total' : 'subtotal'}`;
  const barValue = step === 0 ? (elegido?.nombre ?? (nuevo ? nombre || 'Cliente nuevo' : 'Elige un cliente')) : money(step === 3 ? total : subtotal);

  return (
    <Screen edges={['top']}>
      <StackHeader title="Nuevo pedido" close={step === 0} onBack={back} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Steps steps={STEPS} current={step} />

        {/* ---------- Paso 1: cliente ---------- */}
        {step === 0 && <View style={styles.stack}>
          {elegido ? <Card padded={false}>
            <ListItem title={elegido.nombre} subtitle={[elegido.celular, elegido.direccion].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
              leading={<Avatar name={elegido.nombre} tone="teal" />}
              meta={elegido.puntos > 0 ? <Badge label={`${elegido.puntos} puntos`} tone="violet" /> : undefined}
              trailing={<Button label="Cambiar" variant="ghost" size="sm" onPress={() => { setCliente(null); setUsePreset(false); setPuntos(''); }} />} />
          </Card> : usePreset && preset.isLoading ? <ActivityIndicator color={colors.primary} />
            : nuevo ? <View style={styles.stack}>
              <AppText variant="title">Cliente nuevo</AppText>
              <TextField label="Nombre completo" icon="person-outline" placeholder="Ej. María Torres" value={nombre} onChangeText={setNombre} autoCapitalize="words" maxLength={120} autoFocus />
              <TextField label="Celular / WhatsApp" optional icon="logo-whatsapp" placeholder="999 999 999" value={celular}
                onChangeText={(v) => setCelular(v.replace(/[^\d+\s]/g, ''))} keyboardType="phone-pad" maxLength={20}
                hint="Sirve para avisarle cuando su pedido esté listo." />
              <TextField label="Dirección" optional icon="location-outline" placeholder="Calle, número, distrito" value={direccion}
                onChangeText={setDireccion} autoCapitalize="sentences" maxLength={200} hint="Necesaria para recojo a domicilio." />
              <TextField label="DNI" optional icon="card-outline" placeholder="8 dígitos" value={dni}
                onChangeText={(v) => setDni(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={8} />
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

        {/* ---------- Paso 2: prendas ---------- */}
        {step === 1 && <View style={styles.stack}>
          <AppText variant="title">¿Qué prendas trae?</AppText>
          {lines.length > 0 && <Card padded={false}>
            {lines.map((l, i) => <Fragment key={l.servicio.id}>
              {i > 0 && <Divider />}
              <View style={styles.line}>
                <View style={styles.lineTop}>
                  <View style={styles.flex}>
                    <AppText variant="subheading" numberOfLines={2}>{l.servicio.nombre}</AppText>
                    {l.m2 && <AppText variant="caption">{l.cantidadNum.toFixed(2)} m² × {money(l.precioNum || 0)}</AppText>}
                  </View>
                  <AppText variant="subheading">{money(l.total)}</AppText>
                </View>
                {l.m2 ? <View style={styles.measures}>
                  <Measure label="Ancho (m)" value={l.ancho ?? ''} onChange={(v) => updateLine(l.servicio.id, { ancho: v })} />
                  <Measure label="Largo (m)" value={l.largo ?? ''} onChange={(v) => updateLine(l.servicio.id, { largo: v })} />
                  <Measure label="Piezas" value={l.piezas ?? ''} onChange={(v) => updateLine(l.servicio.id, { piezas: v.replace(/\D/g, '') })} />
                  <Pressable onPress={() => removeLine(l.servicio.id)} style={styles.trash} accessibilityLabel="Quitar servicio" hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View> : <View style={styles.lineControls}>
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
                </View>}
                {l.m2 && <View style={styles.lineControls}>
                  <AppText variant="caption">Precio por m² S/</AppText>
                  <TextInput value={l.precio} onChangeText={(v) => updateLine(l.servicio.id, { precio: v })} keyboardType="decimal-pad"
                    style={styles.price} selectTextOnFocus accessibilityLabel="Precio por metro cuadrado" />
                </View>}
                <TextInput value={l.nota} onChangeText={(v) => updateLine(l.servicio.id, { nota: v })} placeholder="Nota: color, marca, manchas…"
                  placeholderTextColor={colors.placeholder} style={styles.note} maxLength={150} accessibilityLabel="Nota de la prenda" />
              </View>
            </Fragment>)}
          </Card>}
          <Section title="Catálogo de servicios" style={styles.noTop}
            action="+ Crear servicio" onAction={() => setNuevoServicio(true)}>
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
            {!!busquedaServicio.trim() && !catalogo.length && !servicios.isLoading && (
              <InlineAlert tone="info" title="No está en tu lista de precios" text={`Crea «${busquedaServicio.trim()}» y se agregará al pedido.`} />
            )}
            <Button label={busquedaServicio.trim() && !catalogo.length ? `Crear «${busquedaServicio.trim()}»` : 'Crear un servicio nuevo'}
              icon="add-circle-outline" variant="secondary" onPress={() => setNuevoServicio(true)} style={styles.gapTop} />
          </Section>
        </View>}

        {/* ---------- Paso 3: entrega ---------- */}
        {step === 2 && <View style={styles.stack}>
          <AppText variant="title">¿Cómo y cuándo se entrega?</AppText>
          <View style={styles.modes}>
            {MODALIDADES.map((m) => {
              const active = modalidad === m.value;
              return (
                <Pressable key={m.value} onPress={() => cambiarModalidad(m.value)} accessibilityRole="radio" accessibilityState={{ checked: active }}
                  style={[styles.mode, active && styles.modeActive]}>
                  <View style={[styles.modeIcon, active && styles.modeIconActive]}><Ionicons name={m.icon} size={22} color={active ? '#FFFFFF' : colors.primary} /></View>
                  <View style={styles.flex}>
                    <AppText variant="subheading">{m.title}</AppText>
                    <AppText variant="caption">{m.text}</AppText>
                  </View>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primary : colors.borderStrong} />
                </Pressable>
              );
            })}
          </View>

          {modalidad === 'Recojo' && <InlineAlert tone={direccionCliente ? 'info' : 'warning'} title="Dirección de recojo"
            text={direccionCliente || 'Este cliente no tiene dirección. Vuelve al paso 1 para agregarla.'} />}
          {modalidad === 'Delivery' && <Card><LocationPicker value={destino} onChange={setDestino} showErrors={attempted[2]} /></Card>}

          {domicilio && <TextField label={modalidad === 'Delivery' ? 'Tarifa de delivery' : 'Tarifa de recojo'} prefix="S/"
            value={costoDelivery ?? (cfg ? cfg.costoDelivery.toFixed(2) : '')} onChangeText={setCostoDelivery} keyboardType="decimal-pad"
            hint={`Tarifa de tu negocio: ${money(cfg?.costoDelivery ?? 0)}. Puedes ajustarla para este pedido.`} />}

          <DateTimeField label={fechaLabel} value={fechaEntrega} onChange={setFechaEntrega}
            hint={modalidad === 'Delivery' ? 'El cliente verá esta hora en su enlace de seguimiento.' : 'Aparece en el ticket y en el aviso por WhatsApp.'} />

          {(areas.data?.length ?? 0) > 1 && <View>
            <AppText variant="captionStrong" color={colors.text} style={styles.label}>¿En qué área empieza?</AppText>
            <View style={styles.choices}>
              {areas.data!.map((a, i) => <Choice key={a.id} label={a.nombre} selected={(areaId ?? areas.data![0].id) === a.id}
                onPress={() => setAreaId(a.id)} icon={i === 0 ? 'play-outline' : undefined} />)}
            </View>
          </View>}
        </View>}

        {/* ---------- Paso 4: pago y extras ---------- */}
        {step === 3 && <View style={styles.stack}>
          <AppText variant="title">Pago y detalles</AppText>
          <Card>
            <Row label={`Servicios · ${prendas} ${prendas === 1 ? 'unidad' : 'unidades'}`} value={money(itemsSubtotal)} />
            {domicilio && <Row label={modalidad === 'Delivery' ? 'Tarifa de delivery' : 'Tarifa de recojo'} value={money(costoDeliveryNum)} />}
            {descuento > 0 && <Row label={`Descuento (${pctDesc}%)${promo ? ' · promoción' : ''}`} value={`− ${money(descuento)}`} tone={colors.success} />}
            {descuentoPuntos > 0 && <Row label={`Canje de ${puntosNum} puntos`} value={`− ${money(descuentoPuntos)}`} tone={colors.success} />}
            {recargo > 0 && <Row label={`Recargo urgente (${pctUrg}%)`} value={money(recargo)} />}
            <Divider />
            <Row label="Total a cobrar" value={money(total)} strong />
            <AppText variant="caption">El total se redondea a los S/ 0.10, igual que en caja.</AppText>
          </Card>

          <Toggle title="Aplicar descuento" text={maxDesc > 0 ? `Máximo permitido por tu negocio: ${maxDesc}%` : 'Porcentaje sobre el subtotal'}
            value={aplicaDescuento} onChange={(v) => { setAplicaDescuento(v); if (!v) setPromo(null); }}>
            {aplicaDescuento && !promo && <TextField label="Descuento (%)" value={descuentoPct} onChangeText={setDescuentoPct} keyboardType="decimal-pad"
              error={maxDesc > 0 && (parseAmount(descuentoPct) || 0) > maxDesc ? `Se aplicará el máximo: ${maxDesc}%.` : ''} />}
          </Toggle>

          <Card style={styles.gap}>
            <AppText variant="subheading">Código de promoción</AppText>
            {promo ? <View style={styles.promo}>
              <Ionicons name="pricetag" size={18} color={colors.success} />
              <AppText variant="captionStrong" color={colors.success} style={styles.flex}>{promo.descripcion}</AppText>
              <Button label="Quitar" variant="ghost" size="sm" onPress={quitarPromo} />
            </View> : <View style={styles.promoRow}>
              <View style={styles.flex}><TextField label="Código" placeholder="Ej. VERANO10" value={codigoPromo}
                onChangeText={(v) => setCodigoPromo(v.toUpperCase())} autoCapitalize="characters" maxLength={30} error={promoError} /></View>
              <Button label="Aplicar" size="md" variant="secondary" onPress={() => void aplicarPromo()} busy={validandoPromo} disabled={!codigoPromo.trim()} style={styles.promoBtn} />
            </View>}
          </Card>

          {valorPunto > 0 && puntosDisponibles > 0 && <Card style={styles.gap}>
            <AppText variant="subheading">Canjear puntos</AppText>
            <AppText variant="caption">El cliente tiene {puntosDisponibles} puntos · cada punto vale {money(valorPunto)}. Máximo en este pedido: {maxPuntos}.</AppText>
            <View style={styles.promoRow}>
              <View style={styles.flex}><TextField label="Puntos a canjear" value={puntos} onChangeText={(v) => setPuntos(v.replace(/\D/g, ''))} keyboardType="number-pad" /></View>
              <Button label="Usar todos" size="md" variant="secondary" onPress={() => setPuntos(String(maxPuntos))} style={styles.promoBtn} />
            </View>
          </Card>}

          <Toggle title="Pedido urgente" text="Se prioriza en producción y suma un recargo." value={urgente} onChange={setUrgente} danger>
            {urgente && <TextField label="Recargo (%)" value={recargoPct} onChangeText={setRecargoPct} keyboardType="decimal-pad" />}
          </Toggle>

          <TextField label="Observaciones del pedido" optional icon="chatbox-ellipses-outline" placeholder="Indicaciones generales, prendas delicadas…"
            value={observaciones} onChangeText={setObservaciones} autoCapitalize="sentences" maxLength={500} multiline />

          <Card style={styles.gap}>
            <AppText variant="subheading">Fotos de recepción</AppText>
            <FotosPicker uris={fotos} onChange={setFotos} />
          </Card>

          <Card style={styles.gap}>
            <AppText variant="subheading">Adelanto</AppText>
            <TextField label="Monto" optional prefix="S/" placeholder="0.00" value={adelanto} onChangeText={setAdelanto} keyboardType="decimal-pad"
              right={<Pressable onPress={() => setAdelanto(total.toFixed(2))} hitSlop={8}><AppText variant="captionStrong" color={colors.primary}>Pago total</AppText></Pressable>}
              hint={adelantoNum > 0 ? `Saldo al entregar: ${money(Math.max(0, total - adelantoNum))}` : 'Si no cobra ahora, queda todo por cobrar al entregar.'} />
            {adelantoNum > 0 && <View style={styles.choices}>
              {METODOS_PAGO.map((m) => <Choice key={m} label={methodLabel(m)} selected={metodo === m} onPress={() => setMetodo(m)} />)}
            </View>}
          </Card>

          {!!celularCliente && <Toggle title="Enviar resumen por WhatsApp" text={`Se abrirá WhatsApp con el detalle para ${celularCliente}.`}
            value={avisarWhatsapp} onChange={setAvisarWhatsapp} />}
          {save.isError && <InlineAlert title="No se pudo registrar el pedido" text={apiErrorMessage(save.error)} />}
        </View>}

        {attempted[step] && !!errors[step] && <View style={styles.error}><InlineAlert tone="warning" text={errors[step]} /></View>}
      </ScrollView>

      <BottomBar>
        <View style={styles.bar}>
          <View style={styles.flex}>
            <AppText variant="caption">{barCaption}</AppText>
            <AppText style={styles.barTotal} numberOfLines={1}>{barValue}</AppText>
          </View>
          <Button label={step === STEPS.length - 1 ? 'Registrar pedido' : 'Continuar'} iconRight={step === STEPS.length - 1 ? 'checkmark' : 'arrow-forward'}
            onPress={next} busy={save.isPending} style={styles.barButton} />
        </View>
      </BottomBar>

      <NuevoServicioSheet visible={nuevoServicio} catalogo={catalogoCompleto} nombreInicial={busquedaServicio.trim()}
        onClose={() => setNuevoServicio(false)}
        onCreated={(s, existia) => {
          setNuevoServicio(false); setBusquedaServicio(''); addServicio(s);
          toast(existia ? `«${s.nombre}» ya estaba en tu lista; lo agregamos al pedido` : `«${s.nombre}» creado y agregado`);
        }} />
    </Screen>
  );
}

function Measure({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.measure}>
      <AppText variant="caption">{label}</AppText>
      <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.measureInput} selectTextOnFocus accessibilityLabel={label} />
    </View>
  );
}

function Toggle({ title, text, value, onChange, children, danger }: {
  title: string; text: string; value: boolean; onChange: (v: boolean) => void; children?: ReactNode; danger?: boolean;
}) {
  return (
    <Card style={styles.gap}>
      <View style={styles.toggle}>
        <View style={styles.flex}><AppText variant="subheading">{title}</AppText><AppText variant="caption">{text}</AppText></View>
        <Switch value={value} onValueChange={onChange} accessibilityLabel={title}
          trackColor={{ true: danger ? colors.danger : colors.primary, false: colors.borderStrong }} />
      </View>
      {children}
    </Card>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return <View style={styles.row}>
    <AppText variant={strong ? 'subheading' : 'caption'} style={styles.flex}>{label}</AppText>
    <AppText variant={strong ? 'title' : 'captionStrong'} color={tone ?? colors.text}>{value}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl, gap: space.xl },
  stack: { gap: space.lg },
  gap: { gap: space.md },
  gapTop: { marginTop: space.md },
  noTop: { marginTop: 0 },
  label: { marginBottom: space.sm },
  line: { padding: space.lg, gap: space.md },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  lineControls: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qty: { width: 52, textAlign: 'center', color: colors.text, fontFamily: fonts.bold, fontSize: 16, paddingVertical: 6 },
  price: { width: 76, borderBottomWidth: 1.5, borderBottomColor: colors.borderStrong, color: colors.text, fontFamily: fonts.semibold, fontSize: 15, paddingVertical: 6 },
  note: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 8, fontFamily: fonts.regular, fontSize: 13, color: colors.text, backgroundColor: colors.surfaceMuted },
  measures: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  measure: { flex: 1, gap: 4 },
  measureInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 8, textAlign: 'center', fontFamily: fonts.bold, fontSize: 15, color: colors.text, backgroundColor: colors.surfaceMuted },
  trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  loader: { marginVertical: space.xl, flex: 1 },
  service: { width: '48.5%', minHeight: 84, justifyContent: 'space-between', padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  serviceAdded: { borderColor: colors.success, backgroundColor: '#F4FBF7' },
  serviceBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  servicePrice: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  pressed: { opacity: 0.8 },
  modes: { gap: space.sm },
  mode: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  modeActive: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#F5FAFF' },
  modeIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  modeIconActive: { backgroundColor: colors.primary },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  promo: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.successSoft, borderRadius: radius.md, paddingLeft: space.md },
  promoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  promoBtn: { marginTop: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, gap: space.md },
  error: { marginTop: -space.sm },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  barTotal: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  barButton: { minWidth: 170 },
});
