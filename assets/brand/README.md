# Marca LunaLav

Logotipo oficial de LunaLav en vectores, para la app móvil, la web (`LunaLav`) y cualquier material.

| Archivo | Uso |
| --- | --- |
| `lunalav-logo.svg` / `.png` | Logo horizontal con lema, sobre fondos claros |
| `lunalav-logo-blanco.svg` / `.png` | Logo horizontal para fondos azul marino u oscuros |
| `lunalav-mark.svg` / `.png` | Solo el símbolo (ícono, favicon, avatar de redes) |
| `lunalav-mark-blanco.svg` | Símbolo claro para fondos oscuros |

Los SVG no dependen de fuentes instaladas: las letras y el lema están convertidos a curvas.
Las PNG tienen fondo transparente.

## Colores

| Color | Hex | Uso |
| --- | --- | --- |
| Azul marino | `#00245E` | «Luna», estrella, textos y fondos oscuros |
| Azul cielo | `#009AFE` | Símbolo, «Lav» y acentos |
| Azul de acción | `#0074CC` | Botones y enlaces con texto blanco (contraste AA) |

Tipografía de interfaz: **Montserrat** (la misma del lema).

## Para la web de LunaLav

1. Copia `lunalav-logo.svg` y `lunalav-mark.svg` a `frontend/src/assets/`.
2. Usa `lunalav-mark.png` como favicon y como ícono de la app instalable.
3. Actualiza los tokens de `frontend/src/styles.scss` (`--azul-oscuro`, `--azul-claro`) a los colores de arriba.

No modifiques proporciones ni colores del logo. Deja alrededor un margen mínimo igual a la altura
de la estrella pequeña.
