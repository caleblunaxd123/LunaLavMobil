import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { getSedes } from '../api/operationsApi';
import { AppText, Button, EmptyState, ErrorState, InlineAlert, ListSkeleton, Screen, StackHeader, toast } from '../components/ui';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors, radius, space } from '../theme';

export function SeleccionarSedeScreen({ navigation }: AppScreenProps<'SeleccionarSede'>) {
  const session = useAuthStore((s) => s.session)!;
  const { selectSede, logout, error, clearError } = useAuthStore();
  const [choosing, setChoosing] = useState<number | null>(null);
  const sedes = useQuery({ queryKey: ['sedes', session.usuario.negocioId], queryFn: getSedes });
  const activas = (sedes.data ?? []).filter((s) => s.activo);
  const canGoBack = navigation.canGoBack();

  const choose = async (sedeId: number, nombre: string) => {
    clearError();
    setChoosing(sedeId);
    const ok = await selectSede(sedeId);
    setChoosing(null);
    if (!ok) return;
    toast(`Trabajando en ${nombre}`);
    if (canGoBack) navigation.goBack();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      {canGoBack ? <StackHeader title="Cambiar de sede" close onBack={navigation.goBack} /> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={styles.introIcon}><Ionicons name="storefront" size={28} color={colors.primary} /></View>
          <AppText variant="title">¿En qué local trabajas hoy?</AppText>
          <AppText variant="body">Los pedidos, cobros y gastos se registrarán en la sede que elijas. Puedes cambiarla cuando quieras desde «Más».</AppText>
        </View>
        {!!error && <InlineAlert text={error} />}
        {sedes.isLoading ? <ListSkeleton rows={3} /> : sedes.isError ? <ErrorState onRetry={() => void sedes.refetch()} />
          : activas.length ? activas.map((sede) => {
            const current = sede.id === session.usuario.sedeId;
            return (
              <Pressable key={sede.id} disabled={choosing != null || current} onPress={() => void choose(sede.id, sede.nombre)}
                accessibilityRole="radio" accessibilityState={{ checked: current }}
                style={({ pressed }) => [styles.sede, current && styles.current, pressed && styles.pressed]}>
                <View style={styles.sedeIcon}><Ionicons name="location-outline" size={20} color={colors.primary} /></View>
                <View style={styles.flex}>
                  <AppText variant="subheading">{sede.nombre}</AppText>
                  <AppText variant="caption">{current ? 'Sede actual' : sede.direccion || 'Sin dirección registrada'}</AppText>
                </View>
                {choosing === sede.id ? <ActivityIndicator color={colors.primary} />
                  : current ? <Ionicons name="checkmark-circle" size={22} color={colors.success} /> : <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />}
              </Pressable>
            );
          }) : <EmptyState icon="storefront-outline" title="No hay sedes activas" text="Crea o activa una sede desde LunaLav web (Ajustes → Sedes)." />}
        {!canGoBack && <Button label="Cerrar sesión" variant="ghost" icon="log-out-outline" onPress={() => void logout()} style={styles.logout} />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxxl, gap: space.md },
  intro: { gap: space.sm, marginBottom: space.md, marginTop: space.md },
  introIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  sede: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  current: { borderColor: colors.success, borderWidth: 1.5, backgroundColor: '#F4FBF7' },
  pressed: { opacity: 0.85 },
  sedeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  logout: { marginTop: space.lg },
});
