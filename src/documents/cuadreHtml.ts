import type { CuadreCaja } from '../api/gestionApi';
import type { ConfiguracionNegocio } from '../api/pedidoApi';
import { parseDate } from '../utils/format';
import { escapeHtml } from './ticketHtml';

export type EstadoCuadre = 'CUADRA' | 'SOBRA' | 'FALTA';

export const estadoCuadre = (diferencia: number): EstadoCuadre =>
  Math.abs(diferencia) < 0.005 ? 'CUADRA' : diferencia > 0 ? 'SOBRA' : 'FALTA';

const s = (n: number | null | undefined) => `S/ ${(n ?? 0).toFixed(2)}`;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const fechaDocumento = (value: string) => {
  const d = parseDate(value);
  return Number.isFinite(d.getTime()) ? `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}` : value;
};
const fechaHora = (value: string) => {
  const d = parseDate(value);
  const p = (n: number) => String(n).padStart(2, '0');
  return Number.isFinite(d.getTime()) ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}` : value;
};

const css = `
  @page { margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; line-height: 1.4; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #00245E; padding-bottom: 8px; margin-bottom: 12px; }
  .brand { display: flex; gap: 10px; align-items: center; }
  .brand img { max-height: 54px; max-width: 110px; }
  .brand h1 { font-size: 17px; margin: 0 0 2px; color: #00245E; } .brand p, .meta p { margin: 0; }
  .meta { text-align: right; } .meta h2 { margin: 0 0 4px; font-size: 16px; letter-spacing: .6px; color: #00245E; }
  .estado { display: flex; justify-content: space-between; align-items: center; border-radius: 8px; padding: 10px 14px; margin: 10px 0 14px; color: #fff; }
  .estado.CUADRA { background: #0E8F6B; } .estado.SOBRA { background: #C77700; } .estado.FALTA { background: #C0392B; }
  .estado .l { font-size: 10px; letter-spacing: 1px; display: block; opacity: .9; } .estado strong { font-size: 20px; }
  .grid { display: flex; gap: 12px; } .grid > section { flex: 1; }
  section.b { border: 1px solid #cfd6e4; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
  section.b h3 { margin: 0; padding: 6px 10px; background: #EEF2FA; font-size: 12px; color: #00245E; }
  section.b h3 small { font-weight: normal; color: #555; }
  table { width: 100%; border-collapse: collapse; } td { padding: 5px 10px; border-top: 1px solid #e6eaf2; } .r { text-align: right; white-space: nowrap; }
  tr.t td { font-weight: bold; background: #f7f9fd; } tr.t.rojo td { color: #C0392B; } tr.t.naranja td { color: #C77700; }
  .obs { border: 1px solid #cfd6e4; border-radius: 6px; padding: 8px 10px; margin-bottom: 12px; } .obs h3 { margin: 0 0 4px; font-size: 12px; } .obs p { margin: 0; }
  .firmas { display: flex; justify-content: space-around; margin-top: 46px; } .firma { width: 40%; text-align: center; }
  .firma .linea { border-top: 1px solid #111; margin-bottom: 4px; } .firma p { margin: 0; } .firma .n { font-weight: bold; }
  .pie { margin-top: 26px; text-align: center; font-size: 10px; color: #666; }
`;

export function construirCuadreHtml({ cuadre: c, negocio, logoUrl }: { cuadre: CuadreCaja; negocio: ConfiguracionNegocio; logoUrl?: string | null }) {
  const deberia = c.cajaInicial + c.pedidosPagadosEfect - c.gastos;
  const estado = estadoCuadre(c.diferencia);
  const resultado = estado === 'CUADRA' ? 'Cuadre exacto' : estado === 'SOBRA' ? `Sobra ${s(c.diferencia)}` : `Falta ${s(-c.diferencia)}`;
  const digital = c.ingresosDigital > 0 || c.ingresosTarjeta > 0;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body>
  <div class="head">
    <div class="brand">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="">` : ''}<div>
      <h1>${escapeHtml(negocio.nombreNegocio)}</h1>
      ${negocio.direccion ? `<p>${escapeHtml(negocio.direccion)}</p>` : ''}
      ${negocio.telefono ? `<p>Tel: ${escapeHtml(negocio.telefono)}</p>` : ''}
      ${negocio.ruc ? `<p>RUC: ${escapeHtml(negocio.ruc)}</p>` : ''}
    </div></div>
    <div class="meta"><h2>CUADRE DE CAJA</h2>
      <p><strong>Fecha:</strong> ${escapeHtml(fechaDocumento(c.fecha))}</p>
      <p><strong>Responsable:</strong> ${escapeHtml(c.usuarioNombre || '—')}</p>
      <p><strong>Generado:</strong> ${escapeHtml(fechaHora(c.fechaCreacion))}</p>
      <p><strong>Cuadre N°:</strong> #${escapeHtml(c.id)}</p></div>
  </div>
  <div class="estado ${estado}"><div><span class="l">RESULTADO</span><strong>${estado}</strong></div><div>${escapeHtml(resultado)}</div></div>
  <div class="grid">
    <section class="b"><h3>Movimientos del día</h3><table>
      <tr><td>Caja inicial</td><td class="r">${s(c.cajaInicial)}</td></tr>
      <tr><td>+ Pedidos pagados (efectivo)</td><td class="r">${s(c.pedidosPagadosEfect)}</td></tr>
      <tr><td>− Gastos en efectivo</td><td class="r">${s(c.gastos)}</td></tr>
      <tr class="t"><td>= En caja debería haber</td><td class="r">${s(deberia)}</td></tr></table></section>
    <section class="b"><h3>Conteo físico</h3><table>
      <tr><td>Total contado</td><td class="r">${s(c.totalContado)}</td></tr>
      <tr><td>Debería haber</td><td class="r">${s(deberia)}</td></tr>
      <tr class="t ${c.diferencia < -0.005 ? 'rojo' : c.diferencia > 0.01 ? 'naranja' : ''}"><td>Diferencia</td><td class="r">${c.diferencia > 0 ? '+ ' : ''}${s(c.diferencia)}</td></tr></table></section>
  </div>
  <section class="b"><h3>Cierre de caja</h3><table>
    <tr><td>Corte (efectivo entregado)</td><td class="r">${s(c.corte)}</td></tr>
    <tr class="t"><td>Caja final (queda para el día siguiente)</td><td class="r">${s(c.cajaFinal)}</td></tr></table></section>
  ${digital ? `<section class="b"><h3>Ingresos digitales <small>(no pasan por la caja física)</small></h3><table>
    <tr><td>Transferencia móvil (Yape / Plin / Transferencia)</td><td class="r">${s(c.ingresosDigital)}</td></tr>
    <tr><td>Tarjeta / POS</td><td class="r">${s(c.ingresosTarjeta)}</td></tr></table></section>` : ''}
  ${c.nota ? `<section class="obs"><h3>Nota</h3><p>${escapeHtml(c.nota)}</p></section>` : ''}
  <div class="firmas">
    <div class="firma"><div class="linea"></div><p>Responsable de caja</p><p class="n">${escapeHtml(c.usuarioNombre || '')}</p></div>
    <div class="firma"><div class="linea"></div><p>Administrador</p></div>
  </div>
  <p class="pie">Documento generado por ${escapeHtml(negocio.nombreNegocio)} · ${escapeHtml(fechaHora(c.fechaCreacion))}</p>
  </body></html>`;
}
