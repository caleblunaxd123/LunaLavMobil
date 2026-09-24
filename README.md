# LunaLav Mobile

Aplicación móvil nativa de LunaLav, construida con React Native, Expo y TypeScript. Consume la misma API ASP.NET Core y la misma información multiempresa del SaaS web; nunca se conecta directamente a SQL Server.

## Primer hito

- bienvenida y diseño móvil LunaLav;
- acceso por código de empresa, usuario y contraseña;
- sesión cifrada con `expo-secure-store`;
- acceso público a la demo;
- alta autónoma de empresa, sede y administrador con prueba real de 14 días;
- navegación nativa y módulos filtrados por permisos;
- dashboard operativo conectado a información real;
- listados móviles de pedidos, clientes y movimientos de caja;
- recarga por gesto y estados de carga, vacío, permisos y error;
- base preparada para Android e iOS.

## Segundo hito: operación diaria desde el móvil

- registrar pedidos: búsqueda o alta rápida de cliente, catálogo de servicios con cantidades y precios
  ajustables, modalidad en tienda o recojo, fecha de entrega, urgencia, observaciones y adelanto;
- detalle de pedido con prendas, totales, cobros, WhatsApp al cliente, cobro del saldo y avance del
  flujo de áreas hasta la entrega (con las mismas validaciones de la API);
- pedidos filtrados (en curso, listos, entregados, todos) y búsqueda por número, cliente, DNI o celular;
- clientes: búsqueda, ficha con historial de pedidos, alta y edición;
- caja: movimientos por día, totales de ingresos, gastos y efectivo neto, y registro de gastos;
- renovación automática y segura del access token con el refresh token (rotación sin duplicados);
- selección de sede para usuarios sin sede fija y cambio de sede para administradores;
- sección «Más» con perfil, accesos a los módulos web y cierre de sesión con confirmación.

## Ejecutar

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Para Android con emulador o equipo conectado:

```powershell
npm run android
```

## Servicios

- Producción: `https://app.lunalav.pe/api`
- Demo aislada: `https://demo.lunalav.pe/api`

Los orígenes pueden cambiarse con `EXPO_PUBLIC_API_ORIGIN` y `EXPO_PUBLIC_DEMO_API_ORIGIN`.

## Calidad

```powershell
npm run lint
npm run typecheck
```

## Próximos hitos

1. Cámara de prendas, QR y notificaciones push.
2. Delivery con punto de entrega en mapa, entregas parciales, descuentos y canje de puntos.
3. Cuadre de caja desde el móvil.
4. Google Play Billing y StoreKit con validación en el backend.
5. Beta cerrada en Google Play y TestFlight.
