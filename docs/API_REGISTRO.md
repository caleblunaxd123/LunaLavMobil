# Registro autónomo desde la app: contrato de API

La pantalla **Crear cuenta** de LunaLav Móvil usa dos endpoints públicos que **todavía no existen**
en el backend de LunaLav. Mientras falten, la app no se rompe: envía los datos como interesado a
`POST /api/interesados-demo` (endpoint que sí existe) y le dice al usuario que lo contactarán.

## `GET /api/registro/disponible?slug={codigo}`

Verifica en vivo si el código de empresa está libre. Anónimo, con el rate limit `public-read`.

```json
{ "disponible": true }
{ "disponible": false, "mensaje": "Ese código ya está en uso. Prueba con otro." }
```

Si responde 404 o falla, la app no bloquea el registro: la validación final queda en el `POST`.

## `POST /api/registro/prueba`

Crea empresa, sede y usuario administrador con una prueba de 14 días. Anónimo, con el rate limit
`public-write`.

```json
{
  "nombreNegocio": "Lavandería Doña Rosa",
  "slug": "lavanderia-dona-rosa",
  "nombreResponsable": "Rosa Huamán",
  "email": "rosa@correo.com",
  "celular": "987654321",
  "usuario": "rosa",
  "password": "********",
  "plan": "BASICO | FACTURA | MULTISEDE",
  "sedeNombre": "Principal",
  "aceptaTerminos": true
}
```

Respuesta `201`:

```json
{ "negocioId": 42, "slug": "lavanderia-dona-rosa", "pruebaHasta": "2026-10-08", "diasPrueba": 14 }
```

Errores: `400`/`409` con `{ "mensaje": "..." }`, que la app muestra tal cual.

### Reglas que la app ya valida (y el backend debe repetir)

| Campo | Regla |
| --- | --- |
| `slug` | `^[a-z0-9][a-z0-9-]{1,49}$`, sin palabras reservadas (las mismas de `NegociosController`) y único |
| `usuario` | `^[a-z0-9._-]{3,50}$` |
| `password` | mínimo 8 caracteres |
| `email` | formato válido |
| `nombreNegocio` | 2 a 120 caracteres |
| `sedeNombre` | 2 a 80 caracteres |
| `aceptaTerminos` | debe ser `true` |

### Qué debe hacer el endpoint

1. Repetir el alta que ya hace `NegociosController.Crear`: negocio, sede, usuario ADMIN, roles y
   permisos por defecto, configuración inicial y el servicio de cargo a domicilio.
2. Dejar la suscripción en `EstadoSuscripcion = PRUEBA`, con `ProximoPago = hoy + 14 días` y el plan
   elegido (`FACTURA` → `PRO`, `MULTISEDE` → `PREMIUM`).
3. Bloquear el acceso cuando la prueba vence. Hoy `NegocioAccessRules.PuedeOperar` solo bloquea los
   estados `VENCIDA` y `SUSPENDIDA`, así que una prueba vencida seguiría operando si no se ajusta.

Tras un `201`, la app inicia sesión con el `slug`, el `usuario` y la contraseña recién creados.
