import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = { Welcome: undefined; Login: undefined; Trial: undefined };
export type AppTabsParamList = { Inicio: undefined; Pedidos: undefined; Clientes: undefined; Caja: undefined; Más: undefined };

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<AppTabsParamList>;
  PedidoDetalle: { id: number };
  NuevoPedido: { clienteId?: number } | undefined;
  ClienteDetalle: { id: number };
  ClienteForm: { id?: number } | undefined;
  NuevoGasto: undefined;
  SeleccionarSede: undefined;
};

export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;
export type TabScreenProps<T extends keyof AppTabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, T>,
  NativeStackScreenProps<AppStackParamList>
>;
