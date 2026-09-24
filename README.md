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

## Marca

El logotipo oficial está en `assets/brand/` (SVG y PNG, con versión para fondos oscuros). Los
íconos de iOS y Android, el splash y el favicon se generan a partir de él. Detalles y colores en
`assets/brand/README.md`.

## Tercer hito: diseño profesional y experiencia de uso

- sistema de diseño propio (`src/theme`, `src/components/ui`) alineado con LunaLav web: tipografía
  Montserrat, azul marino `#053465` y azul cielo; botones, campos con error por campo, tarjetas,
  insignias de estado, hojas inferiores, avisos flotantes, esqueletos de carga y estados vacíos útiles;
- bienvenida con acciones siempre visibles; inicio de sesión que recuerda empresa y usuario;
- **registro por pasos** (lavandería → cuenta → plan → confirmación) con código de empresa sugerido y
  verificado en vivo, medidor de contraseña y resumen editable (ver `docs/API_REGISTRO.md`);
- listados **paginados** con tope: pedidos (15 por página, en el servidor), clientes (hasta 200,
  paginados en el móvil), caja por día e inventario;
- inicio con indicadores comparados con ayer que abren el filtro correspondiente;
- nuevo pedido en 3 pasos con total siempre visible; detalle con línea de tiempo, cobro y entrega en
  hojas inferiores (incluye «lo recoge otra persona») y aviso por WhatsApp con mensaje listo;
- inventario: stock bajo, favoritos, compras (que también registran el gasto en caja) y consumo;
- pedidos atrasados resaltados; confirmaciones antes de acciones irreversibles.

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

Versión web (útil para revisar el diseño en el navegador): `npm run web`.

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
