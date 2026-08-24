import { hoyISO, sumarDias, diaSemana, diffDias } from './fecha.js'

const TOPE_BUSQUEDA = 500

// Una suspensión afecta a un plan de agenda fija si coincide disciplina, fecha
// y (la suspensión es de todo el día, o es exactamente su horario).
function estaSuspendida(fecha, plan, suspensiones) {
  return suspensiones.some(
    (s) =>
      s.fecha === fecha &&
      s.disciplina === plan.disciplina &&
      (!s.hora || s.hora === plan.hora)
  )
}

// Recorre el calendario desde el inicio y devuelve las fechas de las sesiones
// del plan, saltando las suspendidas (que no consumen ni cuentan).
export function fechasPatron(plan, suspensiones, cantidad) {
  const fechas = []
  const saltadas = []
  if (!plan.dias || plan.dias.length === 0) return { fechas, saltadas }
  let cursor = plan.fechaInicio
  let vueltas = 0
  while (fechas.length < cantidad && vueltas < TOPE_BUSQUEDA) {
    if (plan.dias.includes(diaSemana(cursor))) {
      if (estaSuspendida(cursor, plan, suspensiones)) saltadas.push(cursor)
      else fechas.push(cursor)
    }
    cursor = sumarDias(cursor, 1)
    vueltas++
  }
  return { fechas, saltadas }
}

// Días completos de suspensión de una disciplina dentro de la ventana del plan.
// Solo se usa para compensar los planes ilimitados de funcional.
function diasSuspendidosCompletos(plan, suspensiones, desde, hasta) {
  const vistos = new Set()
  suspensiones.forEach((s) => {
    if (s.disciplina !== plan.disciplina) return
    if (s.hora) return
    if (s.fecha < desde || s.fecha > hasta) return
    vistos.add(s.fecha)
  })
  return vistos.size
}

/**
 * Calcula el estado completo de un plan.
 * Devuelve todo lo que la interfaz necesita mostrar sin volver a calcular nada.
 */
export function estadoPlan(plan, eventos, suspensiones, hoy = hoyISO()) {
  const evs = eventos.filter((e) => e.planId === plan.id)
  const ilimitado = plan.limiteSesiones === null || plan.limiteSesiones === undefined
  const ajusteSesiones = plan.ajusteSesiones || 0
  const ajusteDias = plan.ajusteDias || 0
  const total = ilimitado ? null : Math.max(0, plan.limiteSesiones + ajusteSesiones)

  const extras = evs.filter((e) => e.tipo === 'extra').length
  const asistencias = evs.filter((e) => e.tipo === 'asistio').length
  const faltas = evs.filter((e) => e.tipo === 'falto').length
  const recuperaciones = evs.filter((e) => e.tipo === 'recuperacion').length

  let fechas = []
  let saltadas = []
  let fechaFin
  let consumidas = 0
  let sesionesFuturas = 0

  if (plan.modo === 'fija') {
    const r = fechasPatron(plan, suspensiones, total || 0)
    fechas = r.fechas
    saltadas = r.saltadas
    const base = fechas.length ? fechas[fechas.length - 1] : plan.fechaInicio
    fechaFin = sumarDias(base, ajusteDias)
    // En agenda fija la clase se descuenta pase lo que pase: si la sesión ya
    // ocurrió, consumió. Faltar no devuelve la clase.
    const yaPasadas = fechas.filter((f) => f <= hoy).length
    sesionesFuturas = fechas.filter((f) => f > hoy).length
    consumidas = Math.min(total, yaPasadas + extras)
  } else {
    const finBase = sumarDias(plan.fechaInicio, (plan.duracionDias || 28) - 1)
    let diasExtra = ajusteDias
    if (ilimitado && plan.compensarLluvia !== false) {
      diasExtra += diasSuspendidosCompletos(plan, suspensiones, plan.fechaInicio, finBase)
    }
    fechaFin = sumarDias(finBase, diasExtra)
    // En plan libre solo descuenta la asistencia real.
    consumidas = ilimitado ? 0 : Math.min(total, asistencias + extras)
  }

  const restantes = ilimitado ? null : Math.max(0, total - consumidas)
  const diasRestantes = diffDias(hoy, fechaFin)
  const agotado = !ilimitado && restantes === 0
  const caducado = hoy > fechaFin
  const vencido = agotado || caducado

  // ¿Qué reloj va a llegar primero?
  let venceP = 'fecha'
  let fechaProyectada = fechaFin
  if (!ilimitado) {
    if (agotado) {
      venceP = 'clases'
      const ultimo = evs.filter((e) => e.tipo === 'extra' || e.tipo === 'asistio' || e.tipo === 'falto')
      fechaProyectada = ultimo.length ? ultimo[ultimo.length - 1].fecha : hoy
    } else if (plan.modo === 'fija') {
      if (restantes < sesionesFuturas) {
        venceP = 'clases'
        const proximas = fechas.filter((f) => f > hoy)
        fechaProyectada = proximas[restantes - 1] || fechaFin
      }
    } else {
      // Plan libre con límite: proyecta según el ritmo real de asistencia.
      const transcurridos = Math.max(1, diffDias(plan.fechaInicio, hoy) + 1)
      const ritmo = consumidas / transcurridos
      if (ritmo > 0) {
        const diasParaAgotar = Math.ceil(restantes / ritmo)
        const proy = sumarDias(hoy, diasParaAgotar)
        if (proy < fechaFin) {
          venceP = 'clases'
          fechaProyectada = proy
        }
      }
    }
  }

  const proximaSesion = plan.modo === 'fija' ? fechas.find((f) => f > hoy) || null : null

  return {
    ilimitado,
    total,
    consumidas,
    restantes,
    asistencias,
    faltas,
    extras,
    recuperaciones,
    fechas,
    saltadas,
    fechaFin,
    fechaProyectada,
    diasRestantes,
    duracionDias: plan.duracionDias || 28,
    venceP,
    vencido,
    agotado,
    caducado,
    proximaSesion,
    sesionesFuturas,
    porAvisar: !vencido && ((restantes !== null && restantes <= 2) || diasRestantes <= 3),
  }
}

export function planesDeAlumno(db, alumnoId) {
  return db.planes.filter((p) => p.alumnoId === alumnoId)
}

export function planActivo(db, alumnoId, disciplina) {
  return db.planes
    .filter((p) => p.alumnoId === alumnoId && p.estado === 'activo' && (!disciplina || p.disciplina === disciplina))
    .sort((a, b) => (a.fechaInicio < b.fechaInicio ? 1 : -1))[0]
}

// Saldo agrupado por moneda: cargos menos pagos.
export function saldoAlumno(db, alumnoId) {
  const por = {}
  db.cargos
    .filter((c) => c.alumnoId === alumnoId)
    .forEach((c) => {
      por[c.moneda] = (por[c.moneda] || 0) + Number(c.monto || 0)
    })
  db.pagos
    .filter((p) => p.alumnoId === alumnoId)
    .forEach((p) => {
      por[p.moneda] = (por[p.moneda] || 0) - Number(p.monto || 0)
    })
  Object.keys(por).forEach((m) => {
    por[m] = Math.round(por[m] * 100) / 100
    if (por[m] === 0) delete por[m]
  })
  return por
}

export function saldoTotalPositivo(por) {
  return Object.values(por).reduce((a, b) => a + (b > 0 ? b : 0), 0)
}

// Sesiones que ocurren hoy, agrupadas por horario. Cubre los dos modos.
export function agendaDelDia(db, fecha) {
  const bloques = {}

  db.planes
    .filter((p) => p.estado === 'activo' && p.modo === 'fija')
    .forEach((plan) => {
      const est = estadoPlan(plan, db.eventos, db.suspensiones, fecha)
      // Se evalúa por patrón y ventana, no por la lista de sesiones: si el día
      // está suspendido no aparece en esa lista y el bloque quedaría invisible
      // (y sin forma de reactivarlo).
      const enPatron = (plan.dias || []).includes(diaSemana(fecha))
      const enVentana = fecha >= plan.fechaInicio && fecha <= est.fechaFin
      if (!enPatron || !enVentana) return
      const clave = `${plan.disciplina}|${plan.hora}`
      if (!bloques[clave]) {
        bloques[clave] = {
          clave,
          disciplina: plan.disciplina,
          hora: plan.hora,
          modo: 'fija',
          alumnos: [],
          suspendida: db.suspensiones.some(
            (s) => s.fecha === fecha && s.disciplina === plan.disciplina && (!s.hora || s.hora === plan.hora)
          ),
        }
      }
      bloques[clave].alumnos.push({ plan, estado: est })
    })

  const libres = db.planes.filter((p) => p.estado === 'activo' && p.modo === 'libre')
  if (libres.length) {
    const activos = libres.filter((plan) => {
      const est = estadoPlan(plan, db.eventos, db.suspensiones, fecha)
      return !est.vencido
    })
    if (activos.length) {
      bloques['funcional|libre'] = {
        clave: 'funcional|libre',
        disciplina: 'funcional',
        hora: null,
        modo: 'libre',
        suspendida: db.suspensiones.some((s) => s.fecha === fecha && s.disciplina === 'funcional' && !s.hora),
        alumnos: activos.map((plan) => ({
          plan,
          estado: estadoPlan(plan, db.eventos, db.suspensiones, fecha),
        })),
      }
    }
  }

  return Object.values(bloques).sort((a, b) => String(a.hora || 'zz').localeCompare(String(b.hora || 'zz')))
}

// Lista de cobranza: vencidos, por vencer y deuda suelta.
export function panelCobranza(db, hoy = hoyISO()) {
  const vencidos = []
  const porVencer = []
  const conDeuda = []

  db.planes
    .filter((p) => p.estado === 'activo')
    .forEach((plan) => {
      const alumno = db.alumnos.find((a) => a.id === plan.alumnoId)
      if (!alumno) return
      const est = estadoPlan(plan, db.eventos, db.suspensiones, hoy)
      const item = { plan, alumno, estado: est, saldo: saldoAlumno(db, alumno.id) }
      if (est.vencido) vencidos.push(item)
      else if (est.porAvisar) porVencer.push(item)
    })

  db.alumnos.forEach((alumno) => {
    const saldo = saldoAlumno(db, alumno.id)
    const debe = saldoTotalPositivo(saldo)
    if (debe > 0) conDeuda.push({ alumno, saldo, debe })
  })

  vencidos.sort((a, b) => a.estado.fechaFin.localeCompare(b.estado.fechaFin))
  porVencer.sort((a, b) => a.estado.diasRestantes - b.estado.diasRestantes)
  conDeuda.sort((a, b) => b.debe - a.debe)

  return { vencidos, porVencer, conDeuda }
}

// Proyección del mes: comprometido, cobrado, por cobrar y en riesgo.
export function proyeccionMes(db, desde, hasta, hoy = hoyISO()) {
  const porMoneda = {}
  const detalle = []

  const asegurar = (m) => {
    if (!porMoneda[m]) porMoneda[m] = { comprometido: 0, cobrado: 0, enRiesgo: 0, confirmado: 0, estimado: 0 }
    return porMoneda[m]
  }

  db.planes
    .filter((p) => p.estado === 'activo')
    .forEach((plan) => {
      const alumno = db.alumnos.find((a) => a.id === plan.alumnoId)
      if (!alumno) return
      const est = estadoPlan(plan, db.eventos, db.suspensiones, hoy)
      const fechaRenov = est.venceP === 'clases' ? est.fechaProyectada : est.fechaFin
      if (fechaRenov < desde || fechaRenov > hasta) return
      const m = asegurar(plan.moneda)
      const monto = Number(plan.precio || 0)
      m.comprometido += monto
      if (plan.modo === 'fija' || est.ilimitado) m.confirmado += monto
      else m.estimado += monto
      if (est.vencido && diffDias(est.fechaFin, hoy) > 10) m.enRiesgo += monto
      detalle.push({ alumno, plan, estado: est, fechaRenov, monto })
    })

  db.pagos
    .filter((p) => p.fecha >= desde && p.fecha <= hasta)
    .forEach((p) => {
      asegurar(p.moneda).cobrado += Number(p.monto || 0)
    })

  Object.values(porMoneda).forEach((m) => {
    m.porCobrar = Math.round((m.comprometido - m.cobrado) * 100) / 100
    m.comprometido = Math.round(m.comprometido * 100) / 100
    m.cobrado = Math.round(m.cobrado * 100) / 100
    m.confirmado = Math.round(m.confirmado * 100) / 100
    m.estimado = Math.round(m.estimado * 100) / 100
    m.enRiesgo = Math.round(m.enRiesgo * 100) / 100
  })

  detalle.sort((a, b) => a.fechaRenov.localeCompare(b.fechaRenov))
  return { porMoneda, detalle }
}

// Métrica que dice si el ilimitado está bien vendido.
export function usoIlimitado(db, hoy = hoyISO()) {
  const planes = db.planes.filter((p) => p.modo === 'libre' && (p.limiteSesiones === null || p.limiteSesiones === undefined))
  if (!planes.length) return null
  let asistencias = 0
  let semanas = 0
  planes.forEach((plan) => {
    const est = estadoPlan(plan, db.eventos, db.suspensiones, hoy)
    asistencias += est.asistencias
    const transcurridos = Math.min(est.duracionDias, Math.max(1, diffDias(plan.fechaInicio, hoy) + 1))
    semanas += transcurridos / 7
  })
  return {
    planes: planes.length,
    asistencias,
    promedioSemana: semanas > 0 ? Math.round((asistencias / semanas) * 10) / 10 : 0,
    promedioCiclo: planes.length ? Math.round((asistencias / planes.length) * 10) / 10 : 0,
  }
}

export function ocupacionPorBloque(db, desde, hasta) {
  const conteo = {}
  db.eventos
    .filter((e) => e.fecha >= desde && e.fecha <= hasta && (e.tipo === 'asistio' || e.tipo === 'extra' || e.tipo === 'recuperacion'))
    .forEach((e) => {
      const plan = db.planes.find((p) => p.id === e.planId)
      if (!plan) return
      const clave = plan.modo === 'fija' ? `${plan.disciplina} ${plan.hora}` : 'funcional libre'
      conteo[clave] = (conteo[clave] || 0) + 1
    })
  return Object.entries(conteo)
    .map(([clave, n]) => ({ clave, n }))
    .sort((a, b) => b.n - a.n)
}
