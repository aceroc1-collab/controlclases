import { uid } from './db.js'
import { hoyISO } from './fecha.js'

// Marca estrictamente creciente: dos cambios en el mismo milisegundo tendrían
// la misma marca y el segundo nunca se subiría.
let ultimaMarca = 0
const marca = () => {
  let t = Date.now()
  if (t <= ultimaMarca) t = ultimaMarca + 1
  ultimaMarca = t
  return new Date(t).toISOString()
}
const sellar = (o) => ({ ...o, updated_at: marca() })

export function crearAcciones(setDB) {
  const mut = (fn) => setDB((prev) => fn({ ...prev }))

  // Registra que algo se borró, para que el otro dispositivo también lo borre.
  const enterrar = (db, coleccion, ids) => {
    const lista = Array.isArray(ids) ? ids : [ids]
    db.borrados = [...(db.borrados || []), ...lista.map((id) => ({ coleccion, id, updated_at: marca() }))]
  }

  return {
    guardarAlumno(alumno) {
      mut((db) => {
        if (alumno.id) {
          db.alumnos = db.alumnos.map((a) => (a.id === alumno.id ? sellar({ ...a, ...alumno }) : a))
        } else {
          db.alumnos = [
            ...db.alumnos,
            sellar({ ...alumno, id: uid(), activo: true, creado: hoyISO() }),
          ]
        }
        return db
      })
    },


    archivarAlumno(id, activo) {
      mut((db) => {
        db.alumnos = db.alumnos.map((a) => (a.id === id ? sellar({ ...a, activo }) : a))
        return db
      })
    },

    eliminarAlumno(id) {
      mut((db) => {
        const planes = db.planes.filter((p) => p.alumnoId === id).map((p) => p.id)
        enterrar(db, 'alumnos', id)
        enterrar(db, 'planes', planes)
        enterrar(db, 'eventos', db.eventos.filter((e) => planes.includes(e.planId)).map((e) => e.id))
        enterrar(db, 'ajustesPlan', db.ajustesPlan.filter((x) => planes.includes(x.planId)).map((x) => x.id))
        enterrar(db, 'cargos', db.cargos.filter((c) => c.alumnoId === id).map((c) => c.id))
        enterrar(db, 'pagos', db.pagos.filter((p) => p.alumnoId === id).map((p) => p.id))
        db.alumnos = db.alumnos.filter((a) => a.id !== id)
        db.planes = db.planes.filter((p) => p.alumnoId !== id)
        db.eventos = db.eventos.filter((e) => !planes.includes(e.planId))
        db.ajustesPlan = db.ajustesPlan.filter((x) => !planes.includes(x.planId))
        db.cargos = db.cargos.filter((c) => c.alumnoId !== id)
        db.pagos = db.pagos.filter((p) => p.alumnoId !== id)
        return db
      })
    },

    crearPlan(plan, generarCargo) {
      mut((db) => {
        const id = uid()
        const nuevo = sellar({ ...plan, id, estado: 'activo', ajusteSesiones: 0, ajusteDias: 0, creado: hoyISO() })
        db.planes = [
          ...db.planes.map((p) =>
            p.alumnoId === plan.alumnoId && p.disciplina === plan.disciplina && p.estado === 'activo'
              ? sellar({ ...p, estado: 'cerrado', cerradoEl: hoyISO() })
              : p
          ),
          nuevo,
        ]
        if (generarCargo) {
          db.cargos = [
            ...db.cargos,
            sellar({
              id: uid(),
              alumnoId: plan.alumnoId,
              concepto: plan.nombreTarifa,
              monto: Number(plan.precio || 0),
              moneda: plan.moneda,
              fecha: plan.fechaInicio,
              planId: id,
            }),
          ]
        }
        return db
      })
    },

    cerrarPlan(planId) {
      mut((db) => {
        db.planes = db.planes.map((p) =>
          p.id === planId ? sellar({ ...p, estado: 'cerrado', cerradoEl: hoyISO() }) : p
        )
        return db
      })
    },

    registrarEvento(planId, fecha, tipo) {
      mut((db) => {
        const existente = db.eventos.find((e) => e.planId === planId && e.fecha === fecha)
        if (existente && existente.tipo === tipo) {
          enterrar(db, 'eventos', existente.id)
          db.eventos = db.eventos.filter((e) => e !== existente)
        } else if (existente) {
          db.eventos = db.eventos.map((e) => (e === existente ? sellar({ ...e, tipo }) : e))
        } else {
          db.eventos = [...db.eventos, sellar({ id: uid(), planId, fecha, tipo, creado: hoyISO() })]
        }
        return db
      })
    },

    agregarEventoSuelto(planId, fecha, tipo) {
      mut((db) => {
        db.eventos = [...db.eventos, sellar({ id: uid(), planId, fecha, tipo, creado: hoyISO() })]
        return db
      })
    },

    borrarEvento(eventoId) {
      mut((db) => {
        enterrar(db, 'eventos', eventoId)
        db.eventos = db.eventos.filter((e) => e.id !== eventoId)
        return db
      })
    },

    suspenderBloque(disciplina, fecha, hora, motivo) {
      mut((db) => {
        const ya = db.suspensiones.find(
          (s) => s.fecha === fecha && s.disciplina === disciplina && (s.hora || null) === (hora || null)
        )
        if (ya) {
          enterrar(db, 'suspensiones', ya.id)
          db.suspensiones = db.suspensiones.filter((s) => s !== ya)
        } else {
          db.suspensiones = [
            ...db.suspensiones,
            sellar({ id: uid(), disciplina, fecha, hora: hora || null, motivo: motivo || 'Lluvia', creado: hoyISO() }),
          ]
        }
        return db
      })
    },

    ajustarPlan(planId, { sesiones = 0, dias = 0, motivo }) {
      mut((db) => {
        db.planes = db.planes.map((p) =>
          p.id === planId
            ? sellar({
                ...p,
                ajusteSesiones: (p.ajusteSesiones || 0) + Number(sesiones || 0),
                ajusteDias: (p.ajusteDias || 0) + Number(dias || 0),
              })
            : p
        )
        db.ajustesPlan = [
          ...db.ajustesPlan,
          sellar({
            id: uid(),
            planId,
            sesiones: Number(sesiones || 0),
            dias: Number(dias || 0),
            motivo,
            fecha: hoyISO(),
          }),
        ]
        return db
      })
    },

    agregarCargo(cargo) {
      mut((db) => {
        db.cargos = [...db.cargos, sellar({ ...cargo, id: uid(), monto: Number(cargo.monto || 0) })]
        return db
      })
    },

    borrarCargo(id) {
      mut((db) => {
        enterrar(db, 'cargos', id)
        db.cargos = db.cargos.filter((c) => c.id !== id)
        return db
      })
    },

    agregarPago(pago) {
      mut((db) => {
        db.pagos = [...db.pagos, sellar({ ...pago, id: uid(), monto: Number(pago.monto || 0) })]
        return db
      })
    },

    borrarPago(id) {
      mut((db) => {
        enterrar(db, 'pagos', id)
        db.pagos = db.pagos.filter((p) => p.id !== id)
        return db
      })
    },

    guardarTarifa(tarifa) {
      mut((db) => {
        if (tarifa.id) db.tarifas = db.tarifas.map((t) => (t.id === tarifa.id ? sellar({ ...t, ...tarifa }) : t))
        else db.tarifas = [...db.tarifas, sellar({ ...tarifa, id: uid(), activa: true })]
        return db
      })
    },

    borrarTarifa(id) {
      mut((db) => {
        enterrar(db, 'tarifas', id)
        db.tarifas = db.tarifas.filter((t) => t.id !== id)
        return db
      })
    },

    guardarPlantilla(plantilla) {
      mut((db) => {
        db.plantillas = db.plantillas.map((p) => (p.id === plantilla.id ? sellar({ ...p, ...plantilla }) : p))
        return db
      })
    },

    registrarEnvio(alumnoId, plantilla) {
      mut((db) => {
        db.envios = [...db.envios, sellar({ id: uid(), alumnoId, plantilla, fecha: hoyISO() })]
        return db
      })
    },

    guardarAjustes(ajustes) {
      mut((db) => {
        db.ajustes = { ...db.ajustes, ...ajustes, updated_at: marca() }
        return db
      })
    },

    aplicarSincronizacion(nuevo) {
      setDB(nuevo)
    },

    reemplazarTodo(nuevo) {
      setDB(nuevo)
    },
  }
}
