import * as Updates from 'expo-updates';
import { StyleSheet, View } from 'react-native';
import { LogoMark } from '../components/brand';
import { AppText, Button } from '../components/ui';
import { colors, space } from '../theme';
import { monitoringEnabled } from './monitoring';

/** Se muestra si una pantalla falla, en vez de cerrar la app. */
export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const restart = async () => {
    try { await Updates.reloadAsync(); } catch { onRetry(); }
  };
  return (
    <View style={styles.root}>
      <LogoMark size={72} />
      <AppText variant="title" align="center">Algo salió mal</AppText>
      <AppText variant="body" color={colors.textSecondary} align="center">
        Esta pantalla tuvo un problema. Tus pedidos y cobros ya registrados están a salvo en LunaLav.
        {monitoringEnabled ? ' Ya nos llegó el aviso para corregirlo.' : ''}
      </AppText>
      <View style={styles.actions}>
        <Button label="Reintentar" icon="refresh" onPress={onRetry} />
        <Button label="Reiniciar la app" variant="ghost" onPress={() => void restart()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md, backgroundColor: colors.background },
  actions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.md },
});
