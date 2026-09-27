import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { apiErrorMessage } from '../../api/errors';
import { getConfiguracionCompleta, guardarConfiguracion, type ConfiguracionCompleta } from '../../api/gestionApi';
import { AppText, Button, Card, ErrorState, InlineAlert, ListSkeleton, TextField, toast } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { space } from '../../theme';
import { money, parseAmount } from '../../utils/format';

/** Ajustes del día a día: tarifa de delivery, puntos, tope de descuento, Yape y datos de contacto. */
export function NegocioTab() {
  const negocioId = useAuthStore((s) => s.session?.usuario.negocioId);
  const query = useQuery({ queryKey: ['configuracion-completa', negocioId], queryFn: getConfiguracionCompleta });
  if (query.isLoading) return <View style={styles.content}><ListSkeleton rows={4} /></View>;
  if (!query.data) return <View style={styles.content}><ErrorState onRetry={() => void query.refetch()} /></View>;
  return <NegocioForm initial={query.data} />;
}

function NegocioForm({ initial }: { initial: ConfiguracionCompleta }) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    costoDelivery: initial.costoDelivery.toFixed(2),
    valorPuntoCanje: String(initial.valorPuntoCanje ?? 0),
    solesPorPunto: String(initial.solesPorPunto ?? 1),
    maxDescuentoPct: String(initial.maxDescuentoPct ?? 0),
    yapeNumero: initial.yapeNumero ?? '',
    yapeTitular: initial.yapeTitular ?? '',
    telefono: initial.telefono ?? '',
    direccion: initial.direccion ?? '',
    horarioAtencion: initial.horarioAtencion ?? '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const num = (v: string) => parseAmount(v || '0');
  const errors = {
    costoDelivery: !(num(f.costoDelivery) >= 0 && num(f.costoDelivery) <= 1000) ? 'Entre S/ 0 y S/ 1,000.' : '',
    valorPuntoCanje: !(num(f.valorPuntoCanje) >= 0 && num(f.valorPuntoCanje) <= 100) ? 'Entre 0 y 100.' : '',
    solesPorPunto: !(num(f.solesPorPunto) >= 0.01 && num(f.solesPorPunto) <= 100000) ? 'Debe ser mayor a 0.' : '',
    maxDescuentoPct: !(num(f.maxDescuentoPct) >= 0 && num(f.maxDescuentoPct) <= 100) ? 'Entre 0 y 100.' : '',
  };
  const valid = Object.values(errors).every((e) => !e);
  const save = useMutation({
    mutationFn: () => guardarConfiguracion({
      ...initial,
      costoDelivery: num(f.costoDelivery), valorPuntoCanje: num(f.valorPuntoCanje), solesPorPunto: num(f.solesPorPunto),
      maxDescuentoPct: num(f.maxDescuentoPct), yapeNumero: f.yapeNumero.trim() || null, yapeTitular: f.yapeTitular.trim() || null,
      telefono: f.telefono.trim() || null, direccion: f.direccion.trim() || null, horarioAtencion: f.horarioAtencion.trim() || null,
    }),
    onSuccess: async () => {
      await Promise.all(['configuracion', 'configuracion-completa', 'servicios'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
      toast('Ajustes guardados');
    },
  });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <AppText variant="heading">Delivery y recojo</AppText>
        <TextField label="Tarifa por defecto" prefix="S/" keyboardType="decimal-pad" value={f.costoDelivery} onChangeText={set('costoDelivery')}
          error={errors.costoDelivery} hint="Se propone al registrar pedidos a domicilio; puede ajustarse en cada pedido." />
      </Card>
      <Card style={styles.card}>
        <AppText variant="heading">Puntos y descuentos</AppText>
        <TextField label="Soles de compra por cada punto" keyboardType="decimal-pad" value={f.solesPorPunto} onChangeText={set('solesPorPunto')}
          error={errors.solesPorPunto} hint={`Ej. 1 = el cliente gana 1 punto por cada ${money(num(f.solesPorPunto) || 1)} de consumo.`} />
        <TextField label="Valor de 1 punto al canjear" prefix="S/" keyboardType="decimal-pad" value={f.valorPuntoCanje} onChangeText={set('valorPuntoCanje')}
          error={errors.valorPuntoCanje} hint="0 desactiva el canje de puntos." />
        <TextField label="Descuento máximo permitido (%)" keyboardType="decimal-pad" value={f.maxDescuentoPct} onChangeText={set('maxDescuentoPct')}
          error={errors.maxDescuentoPct} hint="Tope para el personal al aplicar descuentos. 0 = sin tope." />
      </Card>
      <Card style={styles.card}>
        <AppText variant="heading">Cobro por Yape / Plin</AppText>
        <TextField label="Número" optional icon="phone-portrait-outline" keyboardType="phone-pad" value={f.yapeNumero} onChangeText={set('yapeNumero')} maxLength={30} />
        <TextField label="Titular" optional icon="person-outline" value={f.yapeTitular} onChangeText={set('yapeTitular')} autoCapitalize="words" maxLength={120}
          hint="Aparece en el mensaje «va en camino» para que el cliente pague." />
      </Card>
      <Card style={styles.card}>
        <AppText variant="heading">Contacto del local</AppText>
        <TextField label="Teléfono" optional icon="call-outline" keyboardType="phone-pad" value={f.telefono} onChangeText={set('telefono')} maxLength={30} />
        <TextField label="Dirección" optional icon="location-outline" value={f.direccion} onChangeText={set('direccion')} maxLength={200} />
        <TextField label="Horario de atención" optional icon="time-outline" value={f.horarioAtencion} onChangeText={set('horarioAtencion')} multiline maxLength={120}
          placeholder={'Lun a Sáb: 8:30 am - 7:30 pm\nDom: 8:30 am - 3:00 pm'} hint="Una línea por horario; va en el mensaje de WhatsApp al cliente." />
      </Card>
      {save.isError && <InlineAlert title="No se pudo guardar" text={apiErrorMessage(save.error)} />}
      <Button label="Guardar ajustes" icon="checkmark" onPress={() => save.mutate()} disabled={!valid} busy={save.isPending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: space.sm, paddingBottom: space.xxxl, gap: space.md },
  card: { gap: space.md },
});
