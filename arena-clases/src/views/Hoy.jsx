import React, { useState, useMemo } from 'react'
import { agendaDelDia, estadoPlan } from '../lib/motor.js'
import { hoyISO, sumarDias, fmtLarga, fmtHora, DIAS_LARGOS, deISO } from '../lib/fecha.js'
import { Avatar, Vacio, Modal } from '../components/UI.jsx'

export default function Hoy({ db, acc, irAlumno, avisar }) {
  const [fecha, setFecha] = useState(hoyISO())
  const [extra, setExtra] = useState(null)

  const bloques = useMemo(() => agendaDelDia(db, fecha), [db, fecha])
  const esHoy = fecha === hoyISO()

  const candidatosExtra = db.planes
    .filter((p) => p.estado === 'activo')
    .map((p) => ({ plan: p, alumno: db.alumnos.find((a) => a.id === p.alumnoId), est: estadoPlan(p, db.eventos, db.suspensiones, fecha) }))
    .filter((x) => x.alumno && !x.est.vencido)

  return (
    <>
      <div className="fila fila-sep" style={{ marginBottom: 14 }}>
        <button className="btn fantasma chico" onClick={() => setFecha(sumarDias(fecha, -1))} aria-label="Día anterior">
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontFamily: 'Archivo, sans-serif' }}>
            {esHoy ? 'Hoy' : DIAS_LARGOS[deISO(fecha).getDay()]}
          </div>
          <div className="mini">{fmtLarga(fecha)}</div>
        </div>
        <button className="btn fantasma chico" onClick={() => setFecha(sumarDias(fecha, 1))} aria-label="Día siguiente">
          ›
        </button>
      </div>

      {!esHoy && (
        <button className="btn fantasma full chico" style={{ marginBottom: 14 }} onClick={() => setFecha(hoyISO())}>
          Volver a hoy
        </button>
      )}

      {bloques.length === 0 ? (
        <Vacio titulo="No hay clases este día" texto="Los alumnos con agenda fija aparecen automáticamente en sus días asignados." />
      ) : (
        bloques.map((b) => (
          <Bloque key={b.clave} bloque={b} fecha={fecha} db={db} acc={acc} irAlumno={irAlumno} avisar={avisar} />
        ))
      )}

      <button className="btn oro full" style={{ marginTop: 16 }} onClick={() => setExtra(true)}>
        + Clase extra o recuperación
      </button>

      {extra && (
        <Modal titulo="Clase suelta" onCerrar={() => setExtra(null)}>
          <p className="mini" style={{ marginTop: 0 }}>
            La <b>clase extra</b> descuenta una clase del plan y no mueve la fecha de cierre. La{' '}
            <b>recuperación</b> no descuenta nada: repone una clase que el alumno ya pagó y no usó.
          </p>
          {candidatosExtra.length === 0 ? (
            <div className="mini">No hay planes activos.</div>
          ) : (
            candidatosExtra.map(({ plan, alumno, est }) => (
              <div className="card" key={plan.id}>
                <div className="fila">
                  <Avatar nombre={alumno.nombre} disciplina={plan.disciplina} />
                  <div className="crece">
                    <div className="nombre">{alumno.nombre}</div>
                    <div className="sub">
                      {plan.nombreTarifa}
                      {est.ilimitado ? ' · ilimitado' : ` · quedan ${est.restantes}`}
                    </div>
                  </div>
                </div>
                <div className="btns">
                  <button
                    className="btn chico"
                    disabled={est.ilimitado}
                    onClick={() => {
                      acc.agregarEventoSuelto(plan.id, fecha, 'extra')
                      avisar('Clase extra registrada')
                      setExtra(null)
                    }}
                  >
                    Extra (descuenta)
                  </button>
                  <button
                    className="btn chico"
                    onClick={() => {
                      acc.agregarEventoSuelto(plan.id, fecha, 'recuperacion')
                      avisar('Recuperación registrada')
                      setExtra(null)
                    }}
                  >
                    Recuperación
                  </button>
                </div>
              </div>
            ))
          )}
        </Modal>
      )}
    </>
  )
}

function Bloque({ bloque, fecha, db, acc, irAlumno, avisar }) {
  const titulo =
    bloque.modo === 'fija'
      ? `${bloque.disciplina === 'tenis' ? 'Beach tennis' : 'Funcional'} · ${fmtHora(bloque.hora)}`
      : 'Funcional · horario libre'

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="fila fila-sep">
        <div>
          <h3>{titulo}</h3>
          <div className="mini">
            {bloque.alumnos.length} {bloque.modo === 'fija' ? 'inscritos' : 'planes activos'}
            {bloque.suspendida ? ' · suspendida' : ''}
          </div>
        </div>
        <button
          className={'btn chico ' + (bloque.suspendida ? 'pri' : 'fantasma')}
          onClick={() => {
            acc.suspenderBloque(bloque.disciplina, fecha, bloque.modo === 'fija' ? bloque.hora : null, 'Lluvia')
            avisar(bloque.suspendida ? 'Suspensión anulada' : 'Bloque suspendido — los planes se corren')
          }}
        >
          {bloque.suspendida ? 'Reactivar' : 'Suspender'}
        </button>
      </div>

      {bloque.suspendida ? (
        <div className="veredicto aviso" style={{ marginTop: 12 }}>
          Bloque suspendido. No descuenta clases.{' '}
          {bloque.modo === 'fija'
            ? 'La fecha de cierre de cada plan se corrió una sesión.'
            : 'Los planes ilimitados reciben un día extra.'}
        </div>
      ) : (
        <div style={{ marginTop: 6 }}>
          {bloque.alumnos.map(({ plan, estado }) => {
            const alumno = db.alumnos.find((a) => a.id === plan.alumnoId)
            if (!alumno) return null
            const ev = db.eventos.find((e) => e.planId === plan.id && e.fecha === fecha)
            const tipo = ev ? ev.tipo : null
            return (
              <div key={plan.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--linea)' }}>
                <div className="fila">
                  <div onClick={() => irAlumno(alumno.id)} style={{ cursor: 'pointer' }}>
                    <Avatar nombre={alumno.nombre} disciplina={plan.disciplina} />
                  </div>
                  <div className="crece" onClick={() => irAlumno(alumno.id)} style={{ cursor: 'pointer' }}>
                    <div className="nombre">{alumno.nombre}</div>
                    <div className="sub">
                      {estado.ilimitado
                        ? `Ilimitado · ${estado.diasRestantes} días restantes`
                        : `${estado.consumidas}/${estado.total} clases · ${estado.restantes} por usar`}
                    </div>
                  </div>
                </div>
                <div className="asis">
                  <button
                    className={tipo === 'asistio' ? 'sel-si' : ''}
                    onClick={() => acc.registrarEvento(plan.id, fecha, 'asistio')}
                  >
                    Asistió
                  </button>
                  <button
                    className={tipo === 'falto' ? 'sel-no' : ''}
                    onClick={() => acc.registrarEvento(plan.id, fecha, 'falto')}
                  >
                    {bloque.modo === 'fija' ? 'Faltó' : 'No vino'}
                  </button>
                  <button
                    className={tipo === 'recuperacion' ? 'sel-rec' : ''}
                    onClick={() => acc.registrarEvento(plan.id, fecha, 'recuperacion')}
                  >
                    Recupera
                  </button>
                </div>
                {bloque.modo === 'fija' && (
                  <div className="mini" style={{ marginTop: 6 }}>
                    En agenda fija la clase se descuenta igual, venga o no.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
