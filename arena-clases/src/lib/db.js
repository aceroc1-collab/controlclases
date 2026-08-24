import { hoyISO } from './fecha.js'

const CLAVE = 'arena-clases-v1'

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}


export const PLANTILLAS_BASE = [
  {
    id: 'plan-por-vencer',
    nombre: 'Plan por vencer',
    texto:
      'Hola {nombre} 👋 Te escribo de {marca}.\n\nTu plan de {plan} está por terminar: {resumen}.\n\n¿Te reservo el cupo para el próximo ciclo?',
  },
  {
    id: 'plan-vencido',
    nombre: 'Plan vencido con deuda',
    texto:
      'Hola {nombre} 👋 Tu plan de {plan} venció el {fecha_fin}.\n\n{detalle_deuda}\nTotal pendiente: {saldo}\n\nAvísame cuando quieras renovar y te aparto el horario.',
  },
  {
    id: 'cobro-suelto',
    nombre: 'Cobro de clases particulares',
    texto: 'Hola {nombre} 👋 Te paso el detalle de lo pendiente:\n\n{detalle_deuda}\nTotal: {saldo}\n\nGracias!',
  },
  {
    id: 'suspension',
    nombre: 'Clase suspendida',
    texto:
      'Hola {nombre} 👋 La clase de hoy queda suspendida por el clima.\n\nNo se te descuenta y tu plan se corre. Nueva fecha de cierre: {fecha_fin}.\n\nNos vemos en la próxima!',
  },
  {
    id: 'sin-venir',
    nombre: 'Hace días que no viene',
    texto:
      'Hola {nombre} 👋 Te extrañamos en la arena. Tu plan sigue activo hasta el {fecha_fin} y {resumen}.\n\n¿Te esperamos esta semana?',
  },
  {
    id: 'pago-recibido',
    nombre: 'Pago recibido',
    texto: 'Hola {nombre} 👋 Recibido tu pago. Tu plan de {plan} queda activo hasta el {fecha_fin}. Nos vemos!',
  },
]

export const TARIFAS_BASE = [
  { id: uid(), nombre: 'Beach tennis 2x semana', disciplina: 'tenis', modo: 'fija', limiteSesiones: 8, duracionDias: 28, precio: 40, moneda: 'USD', activa: true },
  { id: uid(), nombre: 'Beach tennis 3x semana', disciplina: 'tenis', modo: 'fija', limiteSesiones: 12, duracionDias: 28, precio: 55, moneda: 'USD', activa: true },
  { id: uid(), nombre: 'Beach tennis 4x semana', disciplina: 'tenis', modo: 'fija', limiteSesiones: 16, duracionDias: 28, precio: 70, moneda: 'USD', activa: true },
  { id: uid(), nombre: 'Funcional 8 sesiones', disciplina: 'funcional', modo: 'libre', limiteSesiones: 8, duracionDias: 28, precio: 30, moneda: 'USD', activa: true },
  { id: uid(), nombre: 'Funcional 12 sesiones', disciplina: 'funcional', modo: 'libre', limiteSesiones: 12, duracionDias: 28, precio: 40, moneda: 'USD', activa: true },
  { id: uid(), nombre: 'Funcional mensual ilimitado', disciplina: 'funcional', modo: 'libre', limiteSesiones: null, duracionDias: 28, precio: 50, moneda: 'USD', activa: true },
]

export function dbVacia() {
  return {
    version: 1,
    ajustes: {
      marca: 'Playa Seca',
      moneda: 'USD',
      codigoPais: '58',
      telefonoContacto: '',
      compensarLluviaIlimitado: true,
      ultimoRespaldo: null,
      updated_at: null,
    },
    alumnos: [],
    tarifas: TARIFAS_BASE,
    planes: [],
    eventos: [],
    suspensiones: [],
    cargos: [],
    pagos: [],
    ajustesPlan: [],
    plantillas: PLANTILLAS_BASE,
    envios: [],
    borrados: [],
  }
}

// Rellena cualquier colección que falte para que una restauración vieja no rompa la app.
function normalizar(datos) {
  const base = dbVacia()
  const out = { ...base, ...datos }
  out.ajustes = { ...base.ajustes, ...(datos.ajustes || {}) }
  ;[
    'alumnos',
    'tarifas',
    'planes',
    'eventos',
    'suspensiones',
    'cargos',
    'pagos',
    'ajustesPlan',
    'plantillas',
    'envios',
    'borrados',
  ].forEach((k) => {
    if (!Array.isArray(out[k])) out[k] = base[k]
  })
  if (!out.plantillas.length) out.plantillas = PLANTILLAS_BASE
  return out
}

export function cargarDB() {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return dbVacia()
    return normalizar(JSON.parse(crudo))
  } catch (err) {
    console.error('No se pudo leer el almacenamiento local', err)
    return dbVacia()
  }
}

export function guardarDB(db) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(db))
    return true
  } catch (err) {
    console.error('No se pudo guardar', err)
    return false
  }
}

export function exportarJSON(db) {
  const copia = { ...db, exportadoEl: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(copia, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `respaldo-clases-${hoyISO()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function importarJSON(texto) {
  const datos = JSON.parse(texto)
  if (!datos || typeof datos !== 'object') throw new Error('El archivo no tiene el formato esperado')
  if (!Array.isArray(datos.alumnos)) throw new Error('El archivo no contiene una lista de alumnos')
  return normalizar(datos)
}

export async function pedirAlmacenamientoPersistente() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const yaEs = await navigator.storage.persisted()
      if (yaEs) return true
      return await navigator.storage.persist()
    }
  } catch (err) {
    console.warn('Almacenamiento persistente no disponible', err)
  }
  return false
}
