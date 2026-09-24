# Publicar LunaLav en Google Play

Guía de lo que pide Play Console, con los textos y respuestas ya preparados.

## 1. Compilar el paquete (AAB)

El paquete se compila con EAS Build, que también guarda la llave de firma:

```bash
npm install -g eas-cli
eas login          # cuenta de Expo del equipo
eas init           # vincula este proyecto (agrega extra.eas.projectId a app.json)
eas build -p android --profile production
```

- Genera un `.aab` firmado. EAS crea y guarda la **llave de subida** la primera vez. Descárgala con `eas credentials` y guárdala en un lugar seguro: sin ella no se pueden publicar actualizaciones.
- `production` sube el `versionCode` solo (`autoIncrement` en `eas.json`). Para una versión visible nueva, cambia `version` en `app.json` (ej. `1.0.1`).
- Para probar en un celular antes de subir: `eas build -p android --profile preview` genera un `.apk` instalable.

Primera subida: en Play Console → *Pruebas internas* → *Crear versión* → sube el `.aab`. Luego `eas submit -p android` puede subir las siguientes versiones.

## 2. Ficha de la tienda

**Nombre de la app** (máx. 30): `LunaLav: Gestión de Lavandería`

**Descripción breve** (máx. 80):
`Pedidos, clientes y caja de tu lavandería en el celular. Prueba 14 días gratis.`

**Descripción completa**:

```
LunaLav es el sistema para administrar tu lavandería desde el celular: registra pedidos en segundos, avisa a tus clientes por WhatsApp cuando su ropa está lista y lleva la caja del día sin cuadernos.

PEDIDOS
• Registra un pedido en 3 pasos: cliente, prendas y cobro.
• Sigue cada pedido por etapas: recepción, lavado, secado, doblado y entrega.
• Pedidos urgentes, adelantos y saldos por cobrar siempre a la vista.

CLIENTES
• Historial de pedidos, puntos de fidelidad y datos de contacto.
• Búsqueda por nombre, celular o DNI.
• Un toque para escribirles por WhatsApp o llamarlos.

CAJA E INVENTARIO
• Ingresos, gastos y efectivo esperado del día.
• Cobros en efectivo, Yape, Plin, transferencia o POS.
• Stock de insumos con alerta cuando se están acabando.

PARA TODO TU EQUIPO
• Cada trabajador con su usuario y permisos.
• Varias sedes con un solo sistema (plan Multisede).
• La misma información que LunaLav web, sincronizada al instante.

Boletas y facturas electrónicas SUNAT disponibles en el plan Factura.

Prueba gratis 14 días, sin tarjeta. También puedes explorar la demo con datos de ejemplo sin registrarte.
```

**Categoría**: Empresa · **Etiquetas**: gestión de negocios, punto de venta.
**Correo de contacto**: contacto@lunalav.pe · **Sitio web**: https://lunalav.pe
**Política de privacidad**: https://app.lunalav.pe/privacidad

**Gráficos** (en `docs/play-store/`):
- Ícono 512×512: `icon-512.png`
- Gráfico de funciones 1024×500: `feature-graphic.png`
- Capturas de teléfono (mín. 2, recomendado 4–8): `screenshots/`

## 3. Contenido de la app (Play Console → Política)

| Sección | Respuesta |
|---|---|
| Acceso a la app | **Toda la funcionalidad está disponible sin restricciones**: la app tiene "Explorar la demo sin registrarme" en la pantalla de inicio. (Si piden credenciales: indicar que usen ese botón). |
| Anuncios | **No** contiene anuncios. |
| Clasificación de contenido | Cuestionario IARC → categoría "Utilidad, productividad, comunicación u otro"; responder **No** a todo → resultado "Para todos / PEGI 3". |
| Público objetivo | **18 años o más** (herramienta para negocios). No dirigida a niños. |
| App de noticias | No. |
| Apps de salud / préstamos / gobierno | No. |
| Eliminación de cuenta | URL: **https://app.lunalav.pe/eliminar-cuenta** · En la app: *Más → Eliminar mi cuenta*. |

### Seguridad de los datos

- **¿Recopila o comparte datos?** Sí recopila; **no comparte** con terceros.
- **¿Cifrados en tránsito?** Sí (HTTPS).
- **¿El usuario puede pedir que se borren?** Sí (URL de arriba).

| Tipo de dato | Recopilado | Obligatorio | Finalidad |
|---|---|---|---|
| Información personal → Nombre | Sí | Sí | Funcionalidad de la app, Gestión de la cuenta |
| Información personal → Correo | Sí | Sí (al registrarse) | Gestión de la cuenta, Comunicaciones del desarrollador |
| Información personal → Teléfono | Sí | Sí (al registrarse) | Gestión de la cuenta, Comunicaciones del desarrollador |
| Información financiera → Historial de compras | Sí | Sí | Funcionalidad de la app (pedidos y cobros del negocio) |
| Info. y rendimiento de la app | No | — | — |
| Ubicación, fotos, contactos, audio, archivos | No | — | — |

> Los datos de los clientes de cada lavandería los ingresa el propio negocio (LunaLav actúa como encargado del tratamiento); declararlos igual como "Nombre / Teléfono" recopilados para funcionalidad de la app.

## 4. Antes de enviar a revisión

- [ ] Correr `restablecer-demo-lunalav.ps1` para que la demo tenga datos de ejemplo limpios (los revisores la usan).
- [ ] Probar el `.apk` de `preview` en un celular real: demo, login, nuevo pedido, cobro, cerrar sesión.
- [ ] Revisar y aprobar los textos de https://app.lunalav.pe/privacidad y /eliminar-cuenta (plazos de 30 y 90 días).
- [ ] Cuentas personales nuevas de Play Console: exigen una **prueba cerrada con 12 testers durante 14 días** antes de poder publicar en producción. Las cuentas de organización (con D-U-N-S) no tienen ese requisito.
