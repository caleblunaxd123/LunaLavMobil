import {
  Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold, useFonts,
} from '@expo-google-fonts/montserrat';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from './src/api/queryClient';
import { ToastHost } from './src/components/ui';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { colors } from './src/theme';

export default function App() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const restore = useAuthStore((state) => state.restore);
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold,
  });

  useEffect(() => {
    void restore();
  }, [restore]);

  // Si la fuente falla, la app sigue con la tipografía del sistema en lugar de quedarse cargando.
  if (!hydrated || (!fontsLoaded && !fontError)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AppNavigator />
        <ToastHost />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
