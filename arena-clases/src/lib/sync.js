import { supabase, sesionActual } from './supabase.js'

// Colección local -> cómo se guarda en la nube.
const COLECCIONES = [
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
]

const CLAVE_CURSOR = 'arena-clases-cursor'
const EPOCA = '1970-01-01T00:00:00.000Z'

// Los cursores viven fuera del estado de la app a propósito: si estuvieran
// dentro, cada sincronización cambiaría el estado y dispararía otra ronda.
function leerCursor() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_CURSOR) || '{}')
    return { subidoHasta: c.subidoHasta || EPOCA, bajadoHasta: c.bajadoHasta || EPOCA }
  } catch {
    return { subidoHasta: EPOCA, bajadoHasta: EPOCA }
  }
}

function guardarCursor(c) {
  try {
    localStorage.setItem(CLAVE_CURSOR, JSON.stringify(c))
  } catch (err) {
    console.warn('No se pudo guardar el cursor', err)
  }
}

export function reiniciarCursor() {
  guardarCursor({ subidoHasta: EPOCA, bajadoHasta: EPOCA })
}

// El alumno al que pertenece cada registro, para que su vista solo reciba lo suyo.
function alumnoDe(coleccion, fila, db) {
  if (coleccion === 'alumnos') return fila.id
  if (coleccion === 'planes' || coleccion === 'cargos' || coleccion === 'pagos' || coleccion === 'envios') {
    return fila.alumnoId || null
  }
  if (coleccion === 'eventos' || coleccion === 'ajustesPlan') {
    const plan = db.planes.find((p) => p.id === fila.planId)
    return plan ? plan.alumnoId : null
  }
  return null
}

function aFila(coachId, coleccion, fila, db) {
  return {
    coach_id: coachId,
    coleccion,
    id: fila.id,
    datos: fila,
    alumno_id: alumnoDe(coleccion, fila, db),
    updated_at: fila.updated_at || EPOCA,
    deleted_at: null,
  }
}

/**
 * Una ronda completa: primero sube lo local, después baja lo del otro
 * dispositivo. Devuelve el estado nuevo si algo cambió, o null si no.
 */
export async function sincronizar(db) {
  if (!supabase) return { estado: 'sin-nube' }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { estado: 'sin-conexion' }

  const sesion = await sesionActual()
  if (!sesion) return { estado: 'sin-sesion' }

  const coachId = sesion.user.id
  const cursor = leerCursor()
  // Se marca la hora al empezar: lo que se edite durante la ronda queda
  // por encima de esta marca y entra en la siguiente.
  const ahora = new Date().toISOString()

  try {
    // ---------- 1. Subir cambios locales ----------
    const pendientes = []
    COLECCIONES.forEach((col) => {
      ;(db[col] || []).forEach((fila) => {
        // Inclusivo a propósito: si fuera estricto, un cambio hecho justo en el
        // instante de la última subida quedaría fuera para siempre.
        if ((fila.updated_at || EPOCA) >= cursor.subidoHasta) pendientes.push(aFila(coachId, col, fila, db))
      })
    })

    if ((db.ajustes.updated_at || EPOCA) >= cursor.subidoHasta) {
      pendientes.push({
        coach_id: coachId,
        coleccion: 'ajustes',
        id: 'global',
        datos: db.ajustes,
        alumno_id: null,
        updated_at: db.ajustes.updated_at || EPOCA,
        deleted_at: null,
      })
    }

    // Lo borrado viaja como lápida, no desapareciendo: si no, el dispositivo
    // que estaba desconectado volvería a subir lo que ya eliminaste.
    const lapidas = (db.borrados || []).map((b) => ({
      coach_id: coachId,
      coleccion: b.coleccion,
      id: b.id,
      datos: {},
      alumno_id: null,
      updated_at: b.updated_at,
      deleted_at: b.updated_at,
    }))

    const aSubir = [...pendientes, ...lapidas]
    for (let i = 0; i < aSubir.length; i += 200) {
      const lote = aSubir.slice(i, i + 200)
      const { error } = await supabase.from('registros').upsert(lote, { onConflict: 'coach_id,coleccion,id' })
      if (error) throw error
    }

    // ---------- 2. Bajar cambios del otro dispositivo ----------
    const { data: remotos, error: errorBajada } = await supabase
      .from('registros')
      .select('coleccion,id,datos,updated_at,synced_at,deleted_at')
      .gt('synced_at', cursor.bajadoHasta)
      .order('synced_at', { ascending: true })
      .limit(5000)
    if (errorBajada) throw errorBajada

    let nuevoBajadoHasta = cursor.bajadoHasta
    let cambios = 0
    const siguiente = { ...db }
    COLECCIONES.forEach((c) => {
      siguiente[c] = [...(db[c] || [])]
    })

    ;(remotos || []).forEach((r) => {
      if (r.synced_at > nuevoBajadoHasta) nuevoBajadoHasta = r.synced_at

      if (r.coleccion === 'ajustes') {
        if (!r.deleted_at && r.updated_at > (siguiente.ajustes.updated_at || EPOCA)) {
          siguiente.ajustes = { ...siguiente.ajustes, ...r.datos }
          cambios++
        }
        return
      }

      const col = r.coleccion
      if (!COLECCIONES.includes(col)) return
      const lista = siguiente[col]
      const idx = lista.findIndex((x) => x.id === r.id)

      if (r.deleted_at) {
        if (idx >= 0) {
          lista.splice(idx, 1)
          cambios++
        }
        return
      }

      // Un solo escritor, así que la edición más reciente es la buena.
      if (idx < 0) {
        lista.push(r.datos)
        cambios++
      } else if ((lista[idx].updated_at || EPOCA) < r.updated_at) {
        lista[idx] = r.datos
        cambios++
      }
    })

    // Las lápidas ya viajaron; se limpian para no reenviarlas siempre.
    if ((db.borrados || []).length) {
      siguiente.borrados = []
      cambios++
    }

    guardarCursor({ subidoHasta: ahora, bajadoHasta: nuevoBajadoHasta })

    return {
      estado: 'ok',
      subidos: aSubir.length,
      bajados: (remotos || []).length,
      db: cambios > 0 ? siguiente : null,
      cuando: ahora,
    }
  } catch (err) {
    console.error('Falló la sincronización', err)
    return { estado: 'error', mensaje: err.message || 'Error desconocido' }
  }
}

/** Sube todo desde cero. Se usa la primera vez y al restaurar un respaldo. */
export async function subirTodo(db) {
  reiniciarCursor()
  return sincronizar(db)
}
