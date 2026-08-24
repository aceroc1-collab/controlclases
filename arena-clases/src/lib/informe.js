import { estadoPlan, saldoAlumno, planesDeAlumno } from './motor.js'
import { fmtMonto } from './mensajes.js'
import { hoyISO, fmtCorta, fmtLarga, fmtHora, DIAS_CORTOS } from './fecha.js'

const NOMBRE_EVENTO = {
  asistio: 'Asistió',
  falto: 'Faltó',
  extra: 'Clase extra',
  recuperacion: 'Recuperación',
}

/** Reúne todo lo que va en el informe de un alumno. */
export function datosInforme(db, alumno, hoy = hoyISO()) {
  const planes = planesDeAlumno(db, alumno.id)
  const activos = planes
    .filter((p) => p.estado === 'activo')
    .map((plan) => ({ plan, est: estadoPlan(plan, db.eventos, db.suspensiones, hoy) }))

  const idsPlanes = planes.map((p) => p.id)
  const eventos = db.eventos
    .filter((e) => idsPlanes.includes(e.planId))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 12)

  // Cargos y pagos juntos: mostrar solo los cargos hacía parecer que se debía
  // todo lo que aparecía en la lista, aunque ya estuviera pagado.
  const movimientos = [
    ...db.cargos.filter((c) => c.alumnoId === alumno.id).map((c) => ({ ...c, signo: 1, texto: c.concepto })),
    ...db.pagos
      .filter((p) => p.alumnoId === alumno.id)
      .map((p) => ({ ...p, signo: -1, texto: `Pago${p.metodo ? ' · ' + p.metodo : ''}` })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const saldo = saldoAlumno(db, alumno.id)
  const debe = Object.entries(saldo).filter(([, v]) => v > 0)
  const aFavor = Object.entries(saldo).filter(([, v]) => v < 0)

  return {
    marca: db.ajustes.marca || 'Academia',
    contacto: db.ajustes.telefonoContacto || '',
    alumno,
    fecha: hoy,
    activos,
    eventos,
    movimientos: movimientos.slice(0, 6),
    debe,
    aFavor,
  }
}

function lineaHorario(plan) {
  if (plan.modo !== 'fija') return 'Horario libre'
  const dias = (plan.dias || []).map((d) => DIAS_CORTOS[d]).join(' y ')
  return `${dias} · ${fmtHora(plan.hora)}`
}

function resumenVencimiento(est) {
  if (est.vencido) {
    return est.agotado
      ? `Vencido: consumió las ${est.total} clases`
      : `Vencido el ${fmtCorta(est.fechaFin)}`
  }
  if (est.ilimitado) return `Vence el ${fmtCorta(est.fechaFin)} · quedan ${est.diasRestantes} días`
  if (est.venceP === 'clases') {
    return `Quedan ${est.restantes} clase${est.restantes === 1 ? '' : 's'} · fecha límite ${fmtCorta(est.fechaFin)}`
  }
  return `Vence el ${fmtCorta(est.fechaFin)} · quedan ${est.diasRestantes} días y ${est.restantes} clases`
}

/**
 * Versión de texto. Es la que va directo a WhatsApp: el enlace wa.me solo
 * admite texto, así que esta llega siempre, sin depender de nada del teléfono.
 * WhatsApp interpreta los asteriscos como negrita.
 */
export function textoInforme(d) {
  const L = []
  L.push(`*${d.marca} — Estado de cuenta*`)
  L.push(`${d.alumno.nombre} · ${fmtLarga(d.fecha)}`)
  L.push('')

  if (d.activos.length === 0) {
    L.push('_Sin plan activo en este momento._')
  } else {
    d.activos.forEach(({ plan, est }) => {
      L.push(`*${plan.nombreTarifa}*`)
      L.push(`${lineaHorario(plan)} · desde el ${fmtCorta(plan.fechaInicio)}`)
      if (est.ilimitado) {
        L.push(`Mensual ilimitado · ${est.asistencias} entrenamiento${est.asistencias === 1 ? '' : 's'} este ciclo`)
      } else {
        L.push(`Clases: ${est.consumidas} de ${est.total} usadas (quedan ${est.restantes})`)
      }
      L.push(resumenVencimiento(est))
      if (est.saltadas.length) {
        L.push(`Se corrió ${est.saltadas.length === 1 ? 'una clase' : `${est.saltadas.length} clases`} por suspensión`)
      }
      if (est.proximaSesion) L.push(`Próxima clase: ${fmtLarga(est.proximaSesion)}`)
      L.push('')
    })
  }

  if (d.eventos.length) {
    L.push('*Últimas clases*')
    d.eventos.slice(0, 8).forEach((e) => {
      L.push(`${fmtLarga(e.fecha)} — ${NOMBRE_EVENTO[e.tipo] || e.tipo}`)
    })
    L.push('')
  }

  L.push('*Cuenta*')
  if (d.debe.length) {
    L.push(`Pendiente por pagar: ${d.debe.map(([m, v]) => fmtMonto(v, m)).join(' + ')}`)
  } else if (d.aFavor.length) {
    L.push(`Saldo a favor: ${d.aFavor.map(([m, v]) => fmtMonto(-v, m)).join(' + ')}`)
  } else {
    L.push('Estás al día. No hay nada pendiente.')
  }

  if (d.movimientos.length) {
    L.push('')
    L.push('_Últimos movimientos_')
    d.movimientos.forEach((m) => {
      L.push(`${m.signo > 0 ? '+' : '−'} ${m.texto} (${fmtCorta(m.fecha)}): ${fmtMonto(m.monto, m.moneda)}`)
    })
  }

  if (d.contacto) {
    L.push('')
    L.push(`Cualquier duda me escribes: ${d.contacto}`)
  }

  return L.join('\n')
}

// ---------------------------------------------------------------
//  Dibujo de la imagen
// ---------------------------------------------------------------
// Se dibuja a mano en un canvas en vez de convertir HTML: no hace falta
// ninguna librería, funciona sin conexión y el resultado es idéntico en
// todos los teléfonos.

const A = 1080 // ancho fijo, cómodo para WhatsApp
const MARGEN = 72
const COL = {
  arena: '#f2ede2',
  papel: '#fffdf8',
  marino: '#0f2440',
  dorado: '#c08a2e',
  tinta: '#0f2440',
  tinta2: '#4a5f79',
  linea: '#d8d2c4',
  verde: '#22694f',
  rojo: '#a52f26',
  ambar: '#a06a10',
}

const fuente = (peso, tam) => `${peso} ${tam}px Archivo, Manrope, -apple-system, "Segoe UI", system-ui, sans-serif`

// Los nombres largos existen: se encoge la fuente hasta que quepa y, si aun
// así no cabe, se recorta. Nunca se deja que el texto se salga del informe.
function ajustar(ctx, texto, max, peso, tam, tamMin) {
  let t = tam
  ctx.font = fuente(peso, t)
  while (ctx.measureText(texto).width > max && t > tamMin) {
    t -= 2
    ctx.font = fuente(peso, t)
  }
  if (ctx.measureText(texto).width <= max) return texto
  let corto = texto
  while (corto.length > 4 && ctx.measureText(corto + '…').width > max) {
    corto = corto.slice(0, -1)
  }
  return corto.trimEnd() + '…'
}

function envolver(ctx, texto, max) {
  const palabras = String(texto).split(' ')
  const lineas = []
  let actual = ''
  palabras.forEach((p) => {
    const prueba = actual ? actual + ' ' + p : p
    if (ctx.measureText(prueba).width > max && actual) {
      lineas.push(actual)
      actual = p
    } else {
      actual = prueba
    }
  })
  if (actual) lineas.push(actual)
  return lineas
}

// Cada sección sabe cuánto va a medir antes de pintarse. Hace falta porque el
// fondo de la tarjeta se dibuja primero: si se pintara después, taparía todo.

function altoPlan(ctx, est, anchoUtil) {
  let h = 54 + 38 + 54 + 52
  h += est.ilimitado ? 40 : 46
  ctx.font = fuente(600, 27)
  h += envolver(ctx, resumenVencimiento(est), anchoUtil - 112).length * 34 + 30 + 16
  if (est.saltadas.length) h += 36
  if (est.proximaSesion) h += 36
  return h + 18
}

function altoEventos(d) {
  return Math.min(8, d.eventos.length) * 42 + 42
}

function altoCuenta(d) {
  const cabeza = d.debe.length ? 52 + 46 + 34 : 52 + 46 + 12
  const lista = d.movimientos.length ? 26 + d.movimientos.length * 36 + 12 : 0
  return cabeza + lista
}

function calcularAlto(ctx, d, anchoUtil) {
  let alto = 288
  if (d.activos.length === 0) alto += 78 + 24
  d.activos.forEach(({ est }) => {
    alto += altoPlan(ctx, est, anchoUtil) + 24
  })
  if (d.eventos.length) alto += 48 + altoEventos(d) + 24
  alto += 48 + altoCuenta(d) + 24
  return alto + 100
}

/** Dibuja el informe completo y devuelve la altura usada. */
export function dibujarInforme(canvas, d) {
  const ctx = canvas.getContext('2d')
  const anchoUtil = A - MARGEN * 2
  const alto = calcularAlto(ctx, d, anchoUtil)

  canvas.width = A
  canvas.height = alto

  ctx.fillStyle = COL.arena
  ctx.fillRect(0, 0, A, alto)

  // ---- cabecera ----
  ctx.fillStyle = COL.marino
  ctx.fillRect(0, 0, A, 210)

  ctx.fillStyle = 'rgba(255,253,248,.65)'
  if ('letterSpacing' in ctx) ctx.letterSpacing = '4px'
  ctx.fillText(ajustar(ctx, (d.marca || '').toUpperCase(), anchoUtil - 60, 700, 26, 18), MARGEN, 82)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'

  ctx.fillStyle = COL.papel
  const nombre = ajustar(ctx, d.alumno.nombre, anchoUtil, 800, 54, 34)
  ctx.fillText(nombre, MARGEN, 146)

  ctx.fillStyle = 'rgba(255,253,248,.7)'
  ctx.font = fuente(500, 28)
  ctx.fillText(`Estado de cuenta · ${fmtLarga(d.fecha)}`, MARGEN, 186)

  // cinta de cancha
  for (let x = 0; x < A; x += 40) {
    ctx.fillStyle = COL.marino
    ctx.fillRect(x, 210, 28, 10)
    ctx.fillStyle = COL.dorado
    ctx.fillRect(x + 28, 210, 12, 10)
  }

  let y = 288
  const ix = MARGEN + 32
  const iw = anchoUtil - 64

  if (d.activos.length === 0) {
    fondo(ctx, MARGEN, y, anchoUtil, 78)
    ctx.fillStyle = COL.tinta2
    ctx.font = fuente(600, 30)
    ctx.fillText('Sin plan activo en este momento.', ix, y + 48)
    y += 78 + 24
  }

  d.activos.forEach(({ plan, est }) => {
    const h = altoPlan(ctx, est, anchoUtil)
    fondo(ctx, MARGEN, y, anchoUtil, h)
    let cur = y + 54

    ctx.fillStyle = COL.tinta
    ctx.fillText(ajustar(ctx, plan.nombreTarifa, iw, 800, 36, 24), ix, cur)
    cur += 38

    ctx.fillStyle = COL.tinta2
    ctx.fillText(ajustar(ctx, `${lineaHorario(plan)} · desde el ${fmtCorta(plan.fechaInicio)}`, iw, 500, 26, 20), ix, cur)
    cur += 54

    ctx.fillStyle = COL.marino
    ctx.font = fuente(800, 86)
    const grande = est.ilimitado ? String(Math.max(0, est.diasRestantes)) : String(est.restantes)
    ctx.fillText(grande, ix, cur + 18)
    const anchoNum = ctx.measureText(grande).width

    ctx.fillStyle = COL.tinta2
    const etiqueta = est.ilimitado
      ? 'días restantes'
      : `clase${est.restantes === 1 ? '' : 's'} restante${est.restantes === 1 ? '' : 's'} de ${est.total}`
    ctx.fillText(ajustar(ctx, etiqueta, iw - anchoNum - 18, 600, 28, 20), ix + anchoNum + 18, cur + 18)
    cur += 52

    if (!est.ilimitado) {
      const pct = Math.min(1, est.consumidas / Math.max(1, est.total))
      ctx.fillStyle = '#e2dac9'
      redondeado(ctx, ix, cur, iw, 16, 8)
      ctx.fillStyle = est.vencido ? COL.rojo : COL.dorado
      redondeado(ctx, ix, cur, Math.max(16, iw * pct), 16, 8)
      cur += 46
    } else {
      ctx.fillStyle = COL.tinta2
      ctx.font = fuente(500, 26)
      ctx.fillText(`${est.asistencias} entrenamiento${est.asistencias === 1 ? '' : 's'} este ciclo`, ix, cur + 6)
      cur += 40
    }

    ctx.font = fuente(600, 27)
    const lineas = envolver(ctx, resumenVencimiento(est), iw - 48)
    const altoV = lineas.length * 34 + 30
    ctx.fillStyle = est.vencido ? '#f6dedb' : est.porAvisar ? '#fbeacd' : '#e2dac9'
    redondeado(ctx, ix, cur, iw, altoV, 12)
    ctx.fillStyle = est.vencido ? COL.rojo : est.porAvisar ? COL.ambar : COL.tinta
    ctx.font = fuente(600, 27)
    lineas.forEach((l, i) => ctx.fillText(l, ix + 24, cur + 38 + i * 34))
    cur += altoV + 16

    ctx.fillStyle = COL.tinta2
    ctx.font = fuente(500, 25)
    if (est.saltadas.length) {
      ctx.fillText(
        `Se corrió ${est.saltadas.length === 1 ? 'una clase' : est.saltadas.length + ' clases'} por suspensión`,
        ix,
        cur + 12
      )
      cur += 36
    }
    if (est.proximaSesion) {
      ctx.fillText(`Próxima clase: ${fmtLarga(est.proximaSesion)}`, ix, cur + 12)
    }

    y += h + 24
  })

  if (d.eventos.length) {
    y = titulo(ctx, 'Últimas clases', y)
    const h = altoEventos(d)
    fondo(ctx, MARGEN, y, anchoUtil, h)
    let cur = y + 46
    d.eventos.slice(0, 8).forEach((e) => {
      ctx.fillStyle = COL.tinta
      ctx.font = fuente(500, 27)
      ctx.fillText(fmtLarga(e.fecha), ix, cur)
      const txt = NOMBRE_EVENTO[e.tipo] || e.tipo
      ctx.font = fuente(700, 27)
      ctx.fillStyle = e.tipo === 'falto' ? COL.rojo : e.tipo === 'asistio' ? COL.verde : COL.marino
      ctx.font = fuente(700, 27)
      ctx.fillText(txt, A - MARGEN - 32 - ctx.measureText(txt).width, cur)
      cur += 42
    })
    y += h + 24
  }

  y = titulo(ctx, 'Cuenta', y)
  const hc = altoCuenta(d)
  fondo(ctx, MARGEN, y, anchoUtil, hc)
  let cur = y + 52

  if (d.debe.length) {
    ctx.fillStyle = COL.tinta2
    ctx.font = fuente(600, 25)
    ctx.fillText('PENDIENTE POR PAGAR', ix, cur)
    cur += 46
    ctx.fillStyle = COL.rojo
    ctx.font = fuente(800, 48)
    ctx.fillText(d.debe.map(([m, v]) => fmtMonto(v, m)).join('  +  '), ix, cur)
    cur += 34
  } else if (d.aFavor.length) {
    ctx.fillStyle = COL.verde
    ctx.font = fuente(800, 42)
    ctx.fillText(`Saldo a favor: ${d.aFavor.map(([m, v]) => fmtMonto(-v, m)).join(' + ')}`, ix, cur + 12)
  } else {
    ctx.fillStyle = COL.verde
    ctx.font = fuente(800, 42)
    ctx.fillText('Estás al día', ix, cur + 12)
    cur += 12
  }

  if (d.movimientos.length) {
    cur += 26
    d.movimientos.forEach((m) => {
      ctx.fillStyle = COL.tinta2
      ctx.font = fuente(500, 25)
      const monto = `${m.signo > 0 ? '+' : '−'} ${fmtMonto(m.monto, m.moneda)}`
      ctx.font = fuente(700, 25)
      const anchoMonto = ctx.measureText(monto).width
      ctx.fillText(ajustar(ctx, `${m.texto} · ${fmtCorta(m.fecha)}`, iw - anchoMonto - 24, 500, 25, 19), ix, cur)
      ctx.fillStyle = m.signo > 0 ? COL.tinta : COL.verde
      ctx.font = fuente(700, 25)
      ctx.fillText(monto, A - MARGEN - 32 - anchoMonto, cur)
      cur += 36
    })
  }

  ctx.fillStyle = COL.tinta2
  ctx.fillText(ajustar(ctx, d.contacto ? `${d.marca} · ${d.contacto}` : d.marca, anchoUtil, 500, 24, 18), MARGEN, alto - 42)

  return alto
}

function titulo(ctx, texto, y) {
  ctx.fillStyle = COL.tinta2
  ctx.font = fuente(700, 26)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '3px'
  ctx.fillText(texto.toUpperCase(), MARGEN, y + 22)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  return y + 48
}

function fondo(ctx, x, y, ancho, alto) {
  ctx.fillStyle = COL.papel
  redondeado(ctx, x, y, ancho, alto, 20)
}

function redondeado(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
  ctx.fill()
}

export async function informeABlob(canvas) {
  return new Promise((resolver, rechazar) => {
    canvas.toBlob((b) => (b ? resolver(b) : rechazar(new Error('No se pudo generar la imagen'))), 'image/png')
  })
}

export function nombreArchivo(alumno, fecha) {
  const limpio = (alumno.nombre || 'alumno')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
  return `estado-de-cuenta-${limpio}-${fecha}.png`
}
