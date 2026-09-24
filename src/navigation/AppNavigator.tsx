import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CajaScreen } from '../screens/CajaScreen';
import { ClienteDetalleScreen } from '../screens/ClienteDetalleScreen';
import { ClienteFormScreen } from '../screens/ClienteFormScreen';
import { ClientesScreen } from '../screens/ClientesScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { GastoFormScreen } from '../screens/GastoFormScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MasScreen } from '../screens/MasScreen';
import { NuevoPedidoScreen } from '../screens/NuevoPedidoScreen';
import { PedidoDetalleScreen } from '../screens/PedidoDetalleScreen';
import { PedidosScreen } from '../screens/PedidosScreen';
import { SeleccionarSedeScreen } from '../screens/SeleccionarSedeScreen';
import { TrialScreen } from '../screens/TrialScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import type { AppStackParamList, AppTabsParamList, AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<AppTabsParamList>();
const icons: Record<keyof AppTabsParamList, keyof typeof Ionicons.glyphMap> = {
  Inicio: 'grid-outline', Pedidos: 'receipt-outline', Clientes: 'people-outline', Caja: 'wallet-outline', Más: 'menu-outline',
};

function AuthNavigator() {
  return <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Trial" component={TrialScreen} />
  </AuthStack.Navigator>;
}

function TabsNavigator() {
  return <Tabs.Navigator screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: '#7890A5',
    tabBarStyle: { height: 70, paddingTop: 8, paddingBottom: 9, borderTopColor: colors.border, backgroundColor: '#FFFFFF' },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={size} />,
  })}>
    <Tabs.Screen name="Inicio" component={DashboardScreen} />
    <Tabs.Screen name="Pedidos" component={PedidosScreen} />
    <Tabs.Screen name="Clientes" component={ClientesScreen} />
    <Tabs.Screen name="Caja" component={CajaScreen} />
    <Tabs.Screen name="Más" component={MasScreen} />
  </Tabs.Navigator>;
}

function MainNavigator({ needsSede }: { needsSede: boolean }) {
  return <AppStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    {needsSede
      ? <AppStack.Screen name="SeleccionarSede" component={SeleccionarSedeScreen} />
      : <>
        <AppStack.Screen name="Tabs" component={TabsNavigator} />
        <AppStack.Screen name="PedidoDetalle" component={PedidoDetalleScreen} />
        <AppStack.Screen name="ClienteDetalle" component={ClienteDetalleScreen} />
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
