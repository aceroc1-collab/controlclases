import { fmtCorta } from './fecha.js'
import { saldoAlumno } from './motor.js'

export function fmtMonto(n, moneda = 'USD') {
  const v = Math.round(Number(n || 0) * 100) / 100
  return `${moneda} ${v.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function fmtSaldo(por) {
  const partes = Object.entries(por).map(([m, v]) => fmtMonto(v, m))
  return partes.length ? partes.join(' + ') : 'sin saldo pendiente'
}

// Deja el teléfono en formato internacional sin signos, que es lo que pide wa.me
export function normalizarTelefono(tel, codigoPais = '58') {
  if (!tel) return ''
  let t = String(tel).replace(/[^\d+]/g, '')
  if (t.startsWith('+')) return t.slice(1)
  if (t.startsWith('00')) return t.slice(2)
  if (t.startsWith('0')) return codigoPais + t.slice(1)
  if (t.length <= 10) return codigoPais + t
  return t
}

export function telefonoValido(tel, codigoPais = '58') {
  const n = normalizarTelefono(tel, codigoPais)
  return n.length >= 10 && n.length <= 15
}

function resumenPlan(estado) {
  if (!estado) return 'tu plan está por terminar'
  if (estado.ilimitado) {
    return `te quedan ${Math.max(0, estado.diasRestantes)} días de tu mensual ilimitado`
  }
  if (estado.venceP === 'clases') {
    return `te queda${estado.restantes === 1 ? '' : 'n'} ${estado.restantes} clase${estado.restantes === 1 ? '' : 's'} de ${estado.total}`
  }
  return `llevas ${estado.consumidas} de ${estado.total} clases y vence el ${fmtCorta(estado.fechaFin)}`
}

function detalleDeuda(db, alumnoId) {
  const cargos = db.cargos.filter((c) => c.alumnoId === alumnoId)
  if (!cargos.length) return ''
  const recientes = cargos.slice(-6)
  return recientes.map((c) => `• ${c.concepto}: ${fmtMonto(c.monto, c.moneda)}`).join('\n') + '\n'
}

export function armarMensaje(plantillaTexto, { db, alumno, plan, estado }) {
  const saldo = saldoAlumno(db, alumno.id)
  const vars = {
    '{nombre}': (alumno.nombre || '').split(' ')[0],
    '{nombre_completo}': alumno.nombre || '',
    '{marca}': db.ajustes.marca || 'la academia',
    '{plan}': plan ? plan.nombreTarifa : 'clases',
    '{fecha_fin}': estado ? fmtCorta(estado.fechaFin) : '—',
    '{fecha_inicio}': plan ? fmtCorta(plan.fechaInicio) : '—',
    '{clases_usadas}': estado && !estado.ilimitado ? String(estado.consumidas) : '—',
    '{clases_totales}': estado && !estado.ilimitado ? String(estado.total) : 'ilimitado',
    '{clases_restantes}': estado && !estado.ilimitado ? String(estado.restantes) : 'ilimitado',
    '{dias_restantes}': estado ? String(Math.max(0, estado.diasRestantes)) : '—',
    '{resumen}': resumenPlan(estado),
    '{saldo}': fmtSaldo(saldo),
    '{detalle_deuda}': detalleDeuda(db, alumno.id),
  }
  let texto = plantillaTexto || ''
  Object.entries(vars).forEach(([k, v]) => {
    texto = texto.split(k).join(v)
  })
  return texto
}

export function enlaceWhatsApp(telefono, texto, codigoPais = '58') {
  const num = normalizarTelefono(telefono, codigoPais)
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`
}

export const VARIABLES_DISPONIBLES = [
  '{nombre}',
  '{nombre_completo}',
  '{marca}',
  '{plan}',
  '{fecha_inicio}',
  '{fecha_fin}',
  '{clases_usadas}',
  '{clases_totales}',
  '{clases_restantes}',
  '{dias_restantes}',
  '{resumen}',
  '{saldo}',
  '{detalle_deuda}',
]
