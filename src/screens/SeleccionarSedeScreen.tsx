import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSedes } from '../api/operationsApi';
import { Button, ErrorBox, ScreenTitle, StateView } from '../components/ui';
import type { AppScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

export function SeleccionarSedeScreen({ navigation }: AppScreenProps<'SeleccionarSede'>) {
  const session = useAuthStore((state) => state.session)!;
  const { selectSede, logout, error, clearError } = useAuthStore();
  const [choosing, setChoosing] = useState<number | null>(null);
  const sedes = useQuery({ queryKey: ['sedes', session.usuario.negocioId], queryFn: getSedes });
  const activas = (sedes.data ?? []).filter((s) => s.activo);
  const canGoBack = navigation.canGoBack();

  const choose = async (sedeId: number) => {
    clearError();
    setChoosing(sedeId);
    const ok = await selectSede(sedeId);
    setChoosing(null);
    if (ok && canGoBack) navigation.goBack();
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenTitle kicker="SEDE DE TRABAJO" title="Elige tu sede" onBack={canGoBack ? navigation.goBack : undefined} icon="business-outline" />
      <Text style={styles.subtitle}>Los pedidos, la caja y los reportes se registran en la sede que elijas.</Text>
      {!!error && <ErrorBox message={error} />}
      {activas.length ? activas.map((sede) => {
        const current = sede.id === session.usuario.sedeId;
        return <Pressable key={sede.id} disabled={choosing != null || current} onPress={() => void choose(sede.id)}
          style={({ pressed }) => [styles.sede, current && styles.current, pressed && styles.pressed]}>
          <View style={styles.icon}><Ionicons name="storefront-outline" size={22} color={colors.primary} /></View>
          <View style={styles.flex}>
            <Text style={styles.name}>{sede.nombre}</Text>
            {!!sede.direccion && <Text style={styles.meta}>{sede.direccion}</Text>}
          </View>
          {choosing === sede.id ? <ActivityIndicator color={colors.primary} />
            : current ? <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              : <Ionicons name="chevron-forward" size={18} color="#9AAEBF" />}
        </Pressable>;
      }) : <StateView loading={sedes.isLoading} error={sedes.isError} empty
        emptyTitle="No hay sedes activas" emptyText="Crea o activa una sede desde la configuración web de LunaLav." />}
      {!canGoBack && <Button label="Cerrar sesión" variant="secondary" icon="log-out-outline" onPress={() => void logout()} style={styles.logout} />}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 10 },
  subtitle: { color: colors.muted, lineHeight: 21, marginTop: -8, marginBottom: 8 },
  sede: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 17, borderWidth: 1, borderColor: colors.border, padding: 14 },
  current: { borderColor: colors.success, backgroundColor: '#F2FCF8' },
  pressed: { opacity: 0.8 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E7F7FF', alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.navy, fontWeight: '900', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  logout: { marginTop: 16 },
});
