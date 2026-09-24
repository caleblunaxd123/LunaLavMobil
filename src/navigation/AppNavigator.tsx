import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CajaScreen } from '../screens/CajaScreen';
import { ClienteDetalleScreen } from '../screens/ClienteDetalleScreen';
import { ClienteFormScreen } from '../screens/ClienteFormScreen';
import { ClientesScreen } from '../screens/ClientesScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { GastoFormScreen } from '../screens/GastoFormScreen';
import { InventarioScreen } from '../screens/InventarioScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MasScreen } from '../screens/MasScreen';
import { NuevoPedidoScreen } from '../screens/NuevoPedidoScreen';
import { PedidoDetalleScreen } from '../screens/PedidoDetalleScreen';
import { RegistroScreen } from '../screens/RegistroScreen';
import { PedidosScreen } from '../screens/PedidosScreen';
import { SeleccionarSedeScreen } from '../screens/SeleccionarSedeScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { useAuthStore } from '../store/authStore';
import { colors, fonts } from '../theme';
import type { AppStackParamList, AppTabsParamList, AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<AppTabsParamList>();
const icons: Record<keyof AppTabsParamList, keyof typeof Ionicons.glyphMap> = {
  Inicio: 'home-outline', Pedidos: 'receipt-outline', Clientes: 'people-outline', Caja: 'wallet-outline', Más: 'ellipsis-horizontal-circle-outline',
};
const activeIcons: Record<keyof AppTabsParamList, keyof typeof Ionicons.glyphMap> = {
  Inicio: 'home', Pedidos: 'receipt', Clientes: 'people', Caja: 'wallet', Más: 'ellipsis-horizontal-circle',
};

function AuthNavigator() {
  return <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}>
    <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Registro" component={RegistroScreen} />
  </AuthStack.Navigator>;
}

function TabsNavigator() {
  const insets = useSafeAreaInsets();
  return <Tabs.Navigator screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { height: 68 + insets.bottom, paddingTop: 6, paddingBottom: 10 + insets.bottom, borderTopColor: colors.border, backgroundColor: colors.surface },
    tabBarLabelStyle: { fontSize: 11, lineHeight: 15, fontFamily: fonts.semibold },
    tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? activeIcons[route.name] : icons[route.name]} color={color} size={size} />,
  })}>
    <Tabs.Screen name="Inicio" component={DashboardScreen} />
    <Tabs.Screen name="Pedidos" component={PedidosScreen} />
    <Tabs.Screen name="Clientes" component={ClientesScreen} />
    <Tabs.Screen name="Caja" component={CajaScreen} />
    <Tabs.Screen name="Más" component={MasScreen} />
  </Tabs.Navigator>;
}

function MainNavigator({ needsSede }: { needsSede: boolean }) {
  return <AppStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}>
    {needsSede
      ? <AppStack.Screen name="SeleccionarSede" component={SeleccionarSedeScreen} />
      : <>
        <AppStack.Screen name="Tabs" component={TabsNavigator} />
        <AppStack.Screen name="PedidoDetalle" component={PedidoDetalleScreen} />
        <AppStack.Screen name="ClienteDetalle" component={ClienteDetalleScreen} />
        <AppStack.Screen name="Inventario" component={InventarioScreen} />
        <AppStack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
          <AppStack.Screen name="NuevoPedido" component={NuevoPedidoScreen} />
          <AppStack.Screen name="ClienteForm" component={ClienteFormScreen} />
          <AppStack.Screen name="NuevoGasto" component={GastoFormScreen} />
          <AppStack.Screen name="SeleccionarSede" component={SeleccionarSedeScreen} />
        </AppStack.Group>
      </>}
  </AppStack.Navigator>;
}

export function AppNavigator() {
  const session = useAuthStore((state) => state.session);
  // Las operaciones (pedidos, caja) exigen una sede activa en el token, igual que en la web.
  const needsSede = !!session && session.usuario.sedeId == null;
  return <NavigationContainer>
    {session ? <MainNavigator key={needsSede ? 'sede' : 'app'} needsSede={needsSede} /> : <AuthNavigator />}
  </NavigationContainer>;
}
