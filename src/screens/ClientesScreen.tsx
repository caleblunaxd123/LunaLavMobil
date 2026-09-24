import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getClientes } from '../api/operationsApi';
import { Card, Fab, Message, ScreenTitle, SearchBar, StateView } from '../components/ui';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePermissions } from '../hooks/usePermissions';
import type { TabScreenProps } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

export function ClientesScreen({ navigation }: TabScreenProps<'Clientes'>) {
  const negocioId = useAuthStore((state) => state.session?.usuario.negocioId);
  const can = usePermissions();
  const [texto, setTexto] = useState('');
  const term = useDebouncedValue(texto.trim());
  const allowed = can('CLIENTES');
  const query = useQuery({ queryKey: ['clientes', negocioId, term], queryFn: () => getClientes(term), enabled: allowed });

  if (!allowed) return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.content}>
    <ScreenTitle title="Clientes" icon="people-outline" />
    <Message icon="lock-closed-outline" title="Módulo no incluido" text="Tu usuario no tiene permiso para acceder a clientes." />
  </View></SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.primary} />}
      ListHeaderComponent={<>
        <ScreenTitle title="Clientes" icon="people-outline" />
        <SearchBar value={texto} onChangeText={setTexto} placeholder="Nombre, celular o DNI..." />
      </>}
      ListEmptyComponent={<StateView loading={query.isLoading} error={query.isError} empty
        emptyTitle={term ? 'Sin coincidencias' : 'Aún no hay clientes'}
        emptyText={term ? 'Revisa el nombre o registra un cliente nuevo.' : 'Registra tu primer cliente con el botón de abajo.'} />}
      renderItem={({ item: c }) => <Card onPress={() => navigation.navigate('ClienteDetalle', { id: c.id })} style={styles.row}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{c.nombre.charAt(0).toUpperCase()}</Text></View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{c.nombre}</Text>
          <Text style={styles.meta}>{c.celular || 'Sin celular'}{c.dni ? ` · DNI ${c.dni}` : ''}</Text>
          {!!c.direccion && <Text style={styles.sub} numberOfLines={1}>{c.direccion}</Text>}
        </View>
        {c.puntos > 0 ? <Text style={styles.points}>{c.puntos} pts</Text> : <Ionicons name="chevron-forward" size={18} color="#9AAEBF" />}
      </Card>}
    />
    <Fab icon="person-add-outline" label="Nuevo cliente" onPress={() => navigation.navigate('ClienteForm')} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 96, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E8FBF6', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.success, fontWeight: '900', fontSize: 17 },
  body: { flex: 1 },
  title: { color: colors.text, fontWeight: '900', fontSize: 14 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  sub: { color: '#94A7B8', fontSize: 10, marginTop: 3 },
  points: { color: colors.violet, fontSize: 11, fontWeight: '900', backgroundColor: '#F1EBFF', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
});
