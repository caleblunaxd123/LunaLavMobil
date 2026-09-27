import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { getServicios, type Pedido, type Servicio } from '../../api/operationsApi';
import {
  agregarItem, anularPedido, asignarMotorizado, cambiarFechaEntrega, convertirDelivery, getMotorizados, linkRepartidor,
  type ConfiguracionNegocio,
} from '../../api/pedidoApi';
import { matchDistrito, normalizeText } from '../../constants/distritos';
import { useAuthStore } from '../../store/authStore';
import { colors, space } from '../../theme';
import { money, parseAmount } from '../../utils/format';
import { abrirWhatsapp, mensajeCambioFecha } from '../../utils/whatsapp';
import { destinoError, LocationPicker, type Destino } from '../delivery/LocationPicker';
import { AppText, Avatar, Button, Card, DateTimeField, Divider, InlineAlert, SearchBar, Sheet, TextField, toast } from '../ui';
import { NuevoServicioSheet } from './NuevoServicioSheet';

type Done = () => Promise<unknown> | void;

/** Reprogramar la fecha y hora de entrega/recojo, con aviso opcional al cliente por WhatsApp. */
export function CambiarFechaSheet({ pedido, onClose, onDone }: { pedido: Pedido; onClose: () => void; onDone: Done }) {
  const [fecha, setFecha] = useState<string | null>(pedido.fechaEntregaEst ?? null);
  const [motivo, setMotivo] = useState('');
  const [avisar, setAvisar] = useState(!!pedido.clienteCelular);
  const save = useMutation({
    mutationFn: () => cambiarFechaEntrega(pedido.id, fecha!, motivo),
    onSuccess: async () => {
      await onDone();
      toast('Fecha de entrega actualizada');
      if (avisar && pedido.clienteCelular) void abrirWhatsapp(pedido.clienteCelular, mensajeCambioFecha(pedido, fecha!)).catch(() => undefined);
      onClose();
    },
  });
  return (
    <Sheet visible onClose={onClose} title="Cambiar fecha de entrega" subtitle={`Pedido #${pedido.numero}`}>
      <DateTimeField label={pedido.modalidad === 'Delivery' ? 'Nueva fecha y hora de entrega' : 'Nueva fecha y hora'} value={fecha} onChange={setFecha} />
      <TextField label="Motivo" optional placeholder="Ej. falta secar una prenda" value={motivo} onChangeText={setMotivo} maxLength={200} />
      {!!pedido.clienteCelular && <View style={styles.toggle}>
        <AppText variant="subheading" style={styles.flex}>Avisar al cliente por WhatsApp</AppText>
        <Switch value={avisar} onValueChange={setAvisar} trackColor={{ true: colors.primary, false: colors.borderStrong }} />
      </View>}
      {save.isError && <InlineAlert text={apiErrorMessage(save.error, 'No se pudo actualizar la fecha.')} />}
      <Button label="Guardar nueva fecha" icon="checkmark" onPress={() => save.mutate()} disabled={!fecha} busy={save.isPending} />
    </Sheet>
  );
}

/** Agregar una prenda o servicio a un pedido ya registrado (sube el total). */
export function AgregarItemSheet({ pedido, config, onClose, onDone }: { pedido: Pedido; config?: ConfiguracionNegocio; onClose: () => void; onDone: Done }) {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const servicios = useQuery({ queryKey: ['servicios', negocioId], queryFn: getServicios, staleTime: 5 * 60_000 });
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Servicio | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [nota, setNota] = useState('');
  const [crear, setCrear] = useState(false);
  const lista = useMemo(() => (servicios.data ?? [])
    .filter((s) => s.id !== config?.servicioDeliveryId && (!q.trim() || normalizeText(s.nombre).includes(normalizeText(q)))).slice(0, 30),
  [servicios.data, q, config?.servicioDeliveryId]);
  const cant = parseAmount(cantidad);
  const save = useMutation({
    mutationFn: () => agregarItem(pedido.id, sel!.id, cant, nota),
    onSuccess: async () => { await onDone(); toast(`«${sel!.nombre}» agregado al pedido`); onClose(); },
  });
  return (
    <Sheet visible onClose={onClose} title="Agregar prenda" subtitle={`Pedido #${pedido.numero}`}>
      {sel ? <>
        <Card style={styles.selected}>
          <View style={styles.flex}><AppText variant="subheading">{sel.nombre}</AppText><AppText variant="caption">{money(sel.precio)} / {sel.unidad.toLowerCase()}</AppText></View>
          <Button label="Cambiar" variant="ghost" size="sm" onPress={() => setSel(null)} />
        </Card>
        <TextField label={`Cantidad (${sel.unidad.toLowerCase()})`} value={cantidad} onChangeText={setCantidad} keyboardType="decimal-pad"
          hint={cant > 0 ? `Suma ${money(Math.round(cant * sel.precio * 100) / 100)} al total` : undefined} />
        <TextField label="Nota" optional placeholder="Color, marca, detalle" value={nota} onChangeText={setNota} maxLength={200} />
        {save.isError && <InlineAlert text={apiErrorMessage(save.error)} />}
        <Button label="Agregar al pedido" icon="add" onPress={() => save.mutate()} disabled={!(cant > 0)} busy={save.isPending} />
      </> : <>
        <SearchBar value={q} onChangeText={setQ} placeholder="Buscar servicio" autoFocus />
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {servicios.isLoading ? <ActivityIndicator color={colors.primary} /> : lista.map((s, i) => (
            <View key={s.id}>
              {i > 0 && <Divider />}
              <Pressable onPress={() => setSel(s)} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                <AppText variant="subheading" style={styles.flex} numberOfLines={2}>{s.nombre}</AppText>
                <AppText variant="captionStrong" color={colors.primary}>{money(s.precio)}</AppText>
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <Button label={q.trim() && !lista.length ? `Crear «${q.trim()}»` : 'Crear un servicio nuevo'} icon="add-circle-outline" variant="secondary" onPress={() => setCrear(true)} />
      </>}
      {crear && <NuevoServicioSheet visible catalogo={servicios.data ?? []} nombreInicial={q.trim()} onClose={() => setCrear(false)}
        onCreated={(s) => { setCrear(false); setSel(s); }} />}
    </Sheet>
  );
}

/** Convertir a Delivery o editar el destino (dirección, distrito, referencia y punto en el mapa). */
export function DestinoSheet({ pedido, config, onClose, onDone }: { pedido: Pedido; config?: ConfiguracionNegocio; onClose: () => void; onDone: Done }) {
  const esConversion = pedido.modalidad !== 'Delivery';
  const [destino, setDestino] = useState<Destino>({
    direccion: pedido.direccionEntrega ?? '', distrito: matchDistrito(pedido.distritoEntrega) ?? '', referencia: pedido.referenciaEntrega ?? '',
    latitud: pedido.latitudEntrega ?? null, longitud: pedido.longitudEntrega ?? null,
    confirmada: pedido.latitudEntrega != null && pedido.longitudEntrega != null,
  });
  const [costo, setCosto] = useState((config?.costoDelivery ?? 0).toFixed(2));
  const [touched, setTouched] = useState(false);
  const err = destinoError(destino);
  const save = useMutation({
    mutationFn: () => convertirDelivery(pedido.id, {
      direccionEntrega: destino.direccion.trim(), distritoEntrega: destino.distrito, referenciaEntrega: destino.referencia.trim() || null,
      latitudEntrega: destino.latitud!, longitudEntrega: destino.longitud!, costoDelivery: esConversion ? Math.max(0, parseAmount(costo) || 0) : undefined,
    }),
    onSuccess: async () => {
      await onDone();
      toast(esConversion ? `Pedido #${pedido.numero} convertido a Delivery` : 'Destino actualizado');
      onClose();
    },
  });
  return (
    <Sheet visible onClose={onClose} title={esConversion ? 'Convertir a Delivery' : 'Editar destino'} subtitle={`Pedido #${pedido.numero} · ${pedido.clienteNombre ?? ''}`}>
      <ScrollView style={styles.tall} contentContainerStyle={styles.gap} keyboardShouldPersistTaps="handled">
        <LocationPicker value={destino} onChange={setDestino} showErrors={touched} />
        {esConversion && <TextField label="Tarifa de delivery" prefix="S/" value={costo} onChangeText={setCosto} keyboardType="decimal-pad"
          hint="Se agrega como «Tarifa de domicilio» y sube el total del pedido." />}
        {save.isError && <InlineAlert text={apiErrorMessage(save.error, 'No se pudo guardar el destino.')} />}
      </ScrollView>
      <Button label={esConversion ? 'Convertir a Delivery' : 'Guardar destino'} icon="bicycle-outline" busy={save.isPending}
        onPress={() => { setTouched(true); if (!err) save.mutate(); }} />
    </Sheet>
  );
}

/** Anular el pedido con un motivo (ADMIN o coordinador). */
export function AnularSheet({ pedido, onClose, onDone }: { pedido: Pedido; onClose: () => void; onDone: Done }) {
  const [motivo, setMotivo] = useState('');
  const save = useMutation({
    mutationFn: () => anularPedido(pedido.id, motivo.trim()),
    onSuccess: async () => { await onDone(); toast(`Pedido #${pedido.numero} anulado`, 'info'); onClose(); },
  });
  return (
    <Sheet visible onClose={onClose} title="Anular pedido" subtitle={`#${pedido.numero} · ${money(pedido.total)}`}>
      <InlineAlert tone="warning" text="El pedido deja de contar en ventas y no se puede deshacer. Los cobros ya registrados deben devolverse aparte." />
      <TextField label="Motivo" placeholder="Ej. el cliente canceló el servicio" value={motivo} onChangeText={setMotivo} maxLength={200} autoFocus
        error={motivo && motivo.trim().length < 3 ? 'Escribe al menos 3 caracteres.' : ''} />
      {save.isError && <InlineAlert text={apiErrorMessage(save.error, 'No se pudo anular el pedido.')} />}
      <Button label="Anular pedido" icon="close-circle-outline" variant="danger" onPress={() => save.mutate()}
        disabled={motivo.trim().length < 3} busy={save.isPending} />
    </Sheet>
  );
}

/** Asignar motorizado y compartirle el enlace de ruta (ubicación en vivo para el cliente). */
export function MotorizadoSheet({ pedido, publicUrl, onClose, onDone }: { pedido: Pedido; publicUrl: (p: string) => string; onClose: () => void; onDone: Done }) {
  const queryClient = useQueryClient();
  const motorizados = useQuery({ queryKey: ['motorizados'], queryFn: getMotorizados });
  const activos = (motorizados.data ?? []).filter((m) => m.activo);
  const asignar = useMutation({
    mutationFn: (id: number | null) => asignarMotorizado(pedido.id, id),
    onSuccess: async (_, id) => {
      await onDone();
      await queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] });
      toast(id ? 'Motorizado asignado' : 'Motorizado quitado');
    },
  });
  const link = useMutation({ mutationFn: () => linkRepartidor(pedido.id) });

  const compartir = async (via: 'whatsapp' | 'copiar') => {
    const token = await link.mutateAsync();
    const url = publicUrl(`repartidor/${token}`);
    if (via === 'copiar') { await Clipboard.setStringAsync(url); toast('Enlace del repartidor copiado'); return; }
    const texto = `Pedido #${pedido.numero} para ${pedido.clienteNombre ?? 'cliente'}\n${pedido.direccionEntrega ?? ''}${pedido.distritoEntrega ? `, ${pedido.distritoEntrega}` : ''}`
      + `${pedido.referenciaEntrega ? `\nRef: ${pedido.referenciaEntrega}` : ''}\n\nAbre este enlace al salir para compartir tu ubicación con el cliente:\n${url}`;
    if (pedido.motorizadoCelular) await abrirWhatsapp(pedido.motorizadoCelular, texto);
    else { await Clipboard.setStringAsync(url); toast('El motorizado no tiene celular: copiamos el enlace', 'info'); }
  };

  return (
    <Sheet visible onClose={onClose} title="Motorizado" subtitle={pedido.motorizadoNombre ? `Asignado: ${pedido.motorizadoNombre}` : 'Elige quién hará la entrega'}>
      <ScrollView style={styles.list}>
        {motorizados.isLoading ? <ActivityIndicator color={colors.primary} />
          : !activos.length ? <InlineAlert tone="info" text="No tienes motorizados activos. Agrégalos en Configuración → Motorizados." />
            : activos.map((m, i) => {
              const actual = pedido.motorizadoId === m.id;
              return (
                <View key={m.id}>
                  {i > 0 && <Divider />}
                  <Pressable onPress={() => asignar.mutate(actual ? null : m.id)} disabled={asignar.isPending}
                    style={({ pressed }) => [styles.option, pressed && styles.pressed]} accessibilityRole="radio" accessibilityState={{ checked: actual }}>
                    <Avatar name={m.nombre} size={36} tone="primary" />
                    <View style={styles.flex}><AppText variant="subheading">{m.nombre}</AppText><AppText variant="caption">{m.celular || 'Sin celular'}</AppText></View>
                    <Ionicons name={actual ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={actual ? colors.success : colors.borderStrong} />
                  </Pressable>
                </View>
              );
            })}
      </ScrollView>
      {asignar.isError && <InlineAlert text={apiErrorMessage(asignar.error)} />}
      {!!pedido.motorizadoId && <View style={styles.row2}>
        <Button label="Enviar ruta" icon="logo-whatsapp" size="md" onPress={() => void compartir('whatsapp')} busy={link.isPending} style={styles.flex} />
        <Button label="Copiar enlace" icon="copy-outline" size="md" variant="secondary" onPress={() => void compartir('copiar')} style={styles.flex} />
      </View>}
      {!!pedido.motorizadoCelular && <Button label={`Llamar a ${pedido.motorizadoNombre}`} icon="call-outline" variant="ghost" size="sm"
        onPress={() => void Linking.openURL(`tel:${pedido.motorizadoCelular}`)} />}
      {link.isError && <InlineAlert text={apiErrorMessage(link.error, 'No se pudo generar el enlace.')} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: space.md },
  tall: { maxHeight: 500 },
  list: { maxHeight: 320 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  selected: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 },
  pressed: { opacity: 0.7 },
  row2: { flexDirection: 'row', gap: space.sm },
});
