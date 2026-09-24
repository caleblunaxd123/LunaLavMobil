import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ModuleScreen } from '../screens/ModuleScreen';
import { TrialScreen } from '../screens/TrialScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import type { AppTabsParamList, AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
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

function MainNavigator() {
  return <Tabs.Navigator screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: '#7890A5',
    tabBarStyle: { height: 70, paddingTop: 8, paddingBottom: 9, borderTopColor: colors.border, backgroundColor: '#FFFFFF' },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} color={color} size={size} />,
  })}>
    <Tabs.Screen name="Inicio" component={DashboardScreen} />
    <Tabs.Screen name="Pedidos">{() => <ModuleScreen module="PEDIDOS" title="Pedidos" icon="receipt-outline" />}</Tabs.Screen>
    <Tabs.Screen name="Clientes">{() => <ModuleScreen module="CLIENTES" title="Clientes" icon="people-outline" />}</Tabs.Screen>
    <Tabs.Screen name="Caja">{() => <ModuleScreen module="CAJA" title="Caja" icon="wallet-outline" />}</Tabs.Screen>
    <Tabs.Screen name="Más">{() => <ModuleScreen module="MAS" title="Más herramientas" icon="apps-outline" />}</Tabs.Screen>
  </Tabs.Navigator>;
}

export function AppNavigator() {
  const session = useAuthStore((state) => state.session);
  return <NavigationContainer>{session ? <MainNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
