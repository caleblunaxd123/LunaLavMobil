import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { FlatList, RefreshControl, StyleSheet, Switch, View } from 'react-native';
import {
  AppText, Badge, Button, Card, EmptyState, ErrorState, IconButton, ListSkeleton, Screen, StackHeader, type Tone,
  alerta,
} from '../ui';
import { colors, space } from '../../theme';

export interface VistaItem {
  titulo: string;
  subtitulo?: string;
  activo: boolean;
  /** Etiquetas pequeñas bajo el texto (ej. "En uso"). */
  etiquetas?: { label: string; tone?: Tone }[];
  /** Si es true, no se muestra el interruptor (ej. el propio usuario). */
  sinInterruptor?: boolean;
  icono?: keyof typeof Ionicons.glyphMap;
}

/**
 * Pantalla de lista para los ajustes del negocio: cada elemento se toca para editar y tiene un
 * interruptor activo/inactivo. El botón "+" y el estado vacío crean uno nuevo.
 */
export function ListaAdmin<T extends { id: number }>({
  titulo, subtitulo, onBack, datos, cargando, error, onReintentar, refrescando, onRefrescar, vista, onEditar, onToggle, onNuevo,
  nuevoLabel, vacioTitulo, vacioTexto, encabezado, pie,
}: {
  titulo: string;
  subtitulo?: string;
  onBack: () => void;
  datos: T[] | undefined;
  cargando: boolean;
  error: boolean;
  onReintentar: () => void;
  refrescando?: boolean;
  onRefrescar?: () => void;
  vista: (item: T) => VistaItem;
  onEditar: (item: T) => void;
  onToggle?: (item: T) => void;
  onNuevo: () => void;
  nuevoLabel: string;
  vacioTitulo: string;
  vacioTexto: string;
  encabezado?: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <Screen>
      <StackHeader title={titulo} subtitle={subtitulo} onBack={onBack}
        right={<IconButton icon="add" label={nuevoLabel} tone="primary" onPress={onNuevo} />} />
      <FlatList
        data={datos ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={!!refrescando} onRefresh={onRefrescar} tintColor={colors.primary} />}
        ListHeaderComponent={encabezado ? <View style={styles.header}>{encabezado}</View> : null}
        ListEmptyComponent={cargando ? <ListSkeleton /> : error ? <ErrorState onRetry={onReintentar} />
          : <EmptyState icon="file-tray-outline" title={vacioTitulo} text={vacioTexto} actionLabel={nuevoLabel} onAction={onNuevo} />}
        renderItem={({ item }) => {
          const v = vista(item);
          return (
            <Card style={[styles.row, !v.activo && styles.inactive]} onPress={() => onEditar(item)} accessibilityLabel={`Editar ${v.titulo}`}>
              {v.icono && <View style={styles.icon}><Ionicons name={v.icono} size={19} color={v.activo ? colors.navySoft : colors.muted} /></View>}
              <View style={styles.flex}>
                <AppText variant="subheading" numberOfLines={1}>{v.titulo}</AppText>
                {!!v.subtitulo && <AppText variant="caption" numberOfLines={2}>{v.subtitulo}</AppText>}
                {!!v.etiquetas?.length && <View style={styles.badges}>{v.etiquetas.map((e) => <Badge key={e.label} label={e.label} tone={e.tone ?? 'neutral'} dot={false} />)}</View>}
              </View>
              {!v.sinInterruptor && onToggle && <Switch value={v.activo} onValueChange={() => onToggle(item)}
                accessibilityLabel={v.activo ? `Desactivar ${v.titulo}` : `Activar ${v.titulo}`}
                trackColor={{ true: colors.teal, false: colors.borderStrong }} thumbColor="#FFFFFF" />}
            </Card>
          );
        }}
        ListFooterComponent={<View>{pie}{(datos?.length ?? 0) > 0 && <Button label={nuevoLabel} icon="add" variant="secondary" size="md" onPress={onNuevo} style={styles.footerBtn} />}</View>}
      />
    </Screen>
  );
}

/** Pregunta antes de eliminar. El servidor decide si borra o solo desactiva (según haya historial). */
export function confirmarBorrado(nombre: string, enUso: boolean | undefined, alConfirmar: () => void) {
  alerta(enUso ? 'Desactivar' : 'Eliminar', enUso
    ? `«${nombre}» ya tiene historial, así que se desactivará (deja de aparecer pero no se pierde nada).`
    : `¿Eliminar «${nombre}»? Esta acción no se puede deshacer.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: enUso ? 'Desactivar' : 'Eliminar', style: 'destructive', onPress: alConfirmar },
  ], enUso ? { tone: 'warning', icon: 'eye-off' } : { icon: 'trash' });
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  content: { padding: space.lg, paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.md, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm, padding: space.md },
  inactive: { opacity: 0.6 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  footerBtn: { marginTop: space.sm },
});
