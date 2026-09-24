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

## Próximos hitos

1. Crear y editar pedidos, clientes y movimientos desde el móvil.
2. Cámara de prendas, QR y notificaciones push.
3. Google Play Billing y StoreKit con validación en el backend.
4. Beta cerrada en Google Play y TestFlight.
