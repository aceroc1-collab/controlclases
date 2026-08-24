import React, { useState } from 'react'
import { Modal, Avatar, DobleContador, Veredicto, etiquetaPlan, descripcionHorario } from '../components/UI.jsx'
import EnviarWA from '../components/EnviarWA.jsx'
import { FormAlumno } from './Alumnos.jsx'
import { estadoPlan, planesDeAlumno, saldoAlumno } from '../lib/motor.js'
import { fmtMonto, fmtSaldo } from '../lib/mensajes.js'
import { hoyISO, fmtCorta, fmtLarga, DIAS_CORTOS } from '../lib/fecha.js'
import Informe from '../components/Informe.jsx'

const METODOS = ['Efectivo', 'Pago Móvil', 'Zelle', 'Transferencia', 'Bizum', 'Otro']

export default function AlumnoDetalle({ db, acc, alumnoId, volver, avisar }) {
  const alumno = db.alumnos.find((a) => a.id === alumnoId)
  const [modal, setModal] = useState(null)
  const [planWA, setPlanWA] = useState(null)

  if (!alumno) {
    return (
      <div className="vacio">
        <h3>Este alumno ya no existe</h3>
        <button className="btn full" style={{ marginTop: 14 }} onClick={volver}>
          Volver
        </button>
      </div>
    )
  }

  const planes = planesDeAlumno(db, alumnoId).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
  const activos = planes.filter((p) => p.estado === 'activo')
  const saldo = saldoAlumno(db, alumnoId)
  const movimientos = [
    ...db.cargos.filter((c) => c.alumnoId === alumnoId).map((c) => ({ ...c, clase: 'cargo' })),
    ...db.pagos.filter((p) => p.alumnoId === alumnoId).map((p) => ({ ...p, clase: 'pago' })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha))

  return (
    <>
      <button className="btn fantasma chico" onClick={volver} style={{ marginBottom: 14 }}>
        ‹ Volver
      </button>

      <div className="card">
        <div className="fila">
          <Avatar nombre={alumno.nombre} disciplina={alumno.disciplina} />
          <div className="crece">
            <div className="nombre">{alumno.nombre}</div>
            <div className="sub">
              {alumno.disciplina === 'ambos' ? 'Beach tennis y funcional' : alumno.disciplina === 'tenis' ? 'Beach tennis' : 'Funcional'}
              {alumno.telefono ? ` · ${alumno.telefono}` : ' · sin teléfono'}
            </div>
          </div>
          <button className="btn fantasma chico" onClick={() => setModal({ t: 'editar' })}>
            Editar
          </button>
        </div>
        {alumno.notas ? (
          <div className="veredicto" style={{ marginTop: 12 }}>
            {alumno.notas}
          </div>
        ) : null}
        <button className="btn fantasma full chico" style={{ marginTop: 12 }} onClick={() => setModal({ t: 'informe' })}>
          Generar informe
        </button>
      </div>

      <div className="seccion">
        <div className="seccion-titulo">
          <h2>Planes</h2>
          <button className="btn oro chico" onClick={() => setModal({ t: 'plan' })}>
            + Asignar plan
          </button>
        </div>

        {activos.length === 0 ? (
          <div className="vacio">
            <h3>Sin plan activo</h3>
            <div className="mini">Asígnale un plan para empezar a contar clases y vencimientos.</div>
          </div>
        ) : (
          activos.map((plan) => {
            const est = estadoPlan(plan, db.eventos, db.suspensiones)
            const et = etiquetaPlan(plan, est)
            return (
              <div className={'card' + (est.vencido ? ' card-alerta' : '')} key={plan.id}>
                <div className="fila fila-sep">
                  <div className="crece">
                    <h3>{plan.nombreTarifa}</h3>
                    <div className="mini">
                      {descripcionHorario(plan)} · desde {fmtCorta(plan.fechaInicio)}
                    </div>
                  </div>
                  <span className={'tag ' + et.clase}>{et.txt}</span>
                </div>

                <DobleContador plan={plan} est={est} />
                <Veredicto est={est} />

                {(plan.ajusteSesiones || plan.ajusteDias) ? (
                  <div className="mini" style={{ marginTop: 8 }}>
                    Ajustes manuales: {plan.ajusteSesiones > 0 ? '+' : ''}
                    {plan.ajusteSesiones || 0} clases · {plan.ajusteDias > 0 ? '+' : ''}
                    {plan.ajusteDias || 0} días
                  </div>
                ) : null}

                <div className="btns">
                  <button className="btn wa" onClick={() => setPlanWA({ plan, est })}>
                    Avisar
                  </button>
                  <button className="btn" onClick={() => setModal({ t: 'ajuste', plan })}>
                    Ajustar
                  </button>
                  <button className="btn pri" onClick={() => setModal({ t: 'plan', renovar: plan })}>
                    Renovar
                  </button>
                </div>
                <button
                  className="btn fantasma full chico"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    acc.cerrarPlan(plan.id)
                    avisar('Plan cerrado')
                  }}
                >
                  Cerrar plan sin renovar
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="seccion">
        <div className="seccion-titulo">
          <h2>Cuenta</h2>
          <span className={'tag ' + (Object.values(saldo).some((v) => v > 0) ? 'rojo' : 'verde')}>{fmtSaldo(saldo)}</span>
        </div>

        <div className="btns" style={{ marginTop: 0 }}>
          <button className="btn" onClick={() => setModal({ t: 'cargo' })}>
            + Cargo
          </button>
          <button className="btn pri" onClick={() => setModal({ t: 'pago' })}>
            + Pago
          </button>
        </div>

        {movimientos.length === 0 ? (
          <div className="mini" style={{ marginTop: 12 }}>
            Todavía no hay movimientos.
          </div>
        ) : (
          <div className="card" style={{ marginTop: 12 }}>
            {movimientos.slice(0, 25).map((m) => (
              <div className="hist" key={m.id}>
                <div className="crece">
                  <div style={{ fontWeight: 700 }}>{m.clase === 'cargo' ? m.concepto : `Pago · ${m.metodo || 'sin método'}`}</div>
                  <div className="mini">
                    {fmtCorta(m.fecha)}
                    {m.nota ? ` · ${m.nota}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: m.clase === 'cargo' ? 'var(--rojo)' : 'var(--verde)' }}>
                    {m.clase === 'cargo' ? '+' : '−'}
                    {fmtMonto(m.monto, m.moneda)}
                  </div>
                  <button
                    className="btn fantasma chico"
                    style={{ marginTop: 4, minHeight: 28, padding: '2px 8px', fontSize: 11 }}
                    onClick={() => {
                      if (m.clase === 'cargo') acc.borrarCargo(m.id)
                      else acc.borrarPago(m.id)
                      avisar('Movimiento eliminado')
                    }}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <HistorialAsistencias db={db} acc={acc} planes={planes} avisar={avisar} />

      <div className="seccion">
        <button
          className="btn fantasma full chico"
          onClick={() => {
            acc.archivarAlumno(alumno.id, alumno.activo === false)
            avisar(alumno.activo === false ? 'Alumno reactivado' : 'Alumno archivado')
          }}
        >
          {alumno.activo === false ? 'Reactivar alumno' : 'Archivar alumno'}
        </button>
      </div>

      {modal && modal.t === 'informe' && (
        <Informe db={db} acc={acc} alumno={alumno} onCerrar={() => setModal(null)} avisar={avisar} />
      )}
      {modal && modal.t === 'editar' && (
        <FormAlumno db={db} acc={acc} inicial={alumno} onCerrar={() => setModal(null)} avisar={avisar} />
      )}
      {modal && modal.t === 'plan' && (
        <FormPlan
          db={db}
          acc={acc}
          alumno={alumno}
          base={modal.renovar}
          onCerrar={() => setModal(null)}
          avisar={avisar}
        />
      )}
      {modal && modal.t === 'ajuste' && (
        <FormAjuste db={db} acc={acc} plan={modal.plan} onCerrar={() => setModal(null)} avisar={avisar} />
      )}
      {modal && modal.t === 'cargo' && (
        <FormCargo db={db} acc={acc} alumno={alumno} onCerrar={() => setModal(null)} avisar={avisar} />
      )}
      {modal && modal.t === 'pago' && (
        <FormPago db={db} acc={acc} alumno={alumno} onCerrar={() => setModal(null)} avisar={avisar} />
      )}
      {planWA && (
        <EnviarWA
          db={db}
          acc={acc}
          alumno={alumno}
          plan={planWA.plan}
          estado={planWA.est}
          onCerrar={() => setPlanWA(null)}
          avisar={avisar}
        />
      )}
    </>
  )
}

function HistorialAsistencias({ db, acc, planes, avisar }) {
  const ids = planes.map((p) => p.id)
  const evs = db.eventos
    .filter((e) => ids.includes(e.planId))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 20)
  if (!evs.length) return null
  const nombre = { asistio: 'Asistió', falto: 'Faltó', extra: 'Clase extra', recuperacion: 'Recuperación' }
  return (
    <div className="seccion">
      <h2>Últimas asistencias</h2>
      <div className="card" style={{ marginTop: 12 }}>
        {evs.map((e) => (
          <div className="hist" key={e.id}>
            <div>
              <div style={{ fontWeight: 700 }}>{nombre[e.tipo] || e.tipo}</div>
              <div className="mini">{fmtLarga(e.fecha)}</div>
            </div>
            <button
              className="btn fantasma chico"
              style={{ minHeight: 30, fontSize: 11 }}
              onClick={() => {
                acc.borrarEvento(e.id)
                avisar('Registro eliminado')
              }}
            >
              Borrar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function FormPlan({ db, acc, alumno, base, onCerrar, avisar }) {
  const disponibles = db.tarifas.filter((t) => t.activa !== false)
  const inicialTarifa = base ? disponibles.find((t) => t.id === base.tarifaId) || disponibles[0] : disponibles[0]
  const [tarifaId, setTarifaId] = useState(inicialTarifa ? inicialTarifa.id : '')
  const tarifa = disponibles.find((t) => t.id === tarifaId)
  const [fechaInicio, setFechaInicio] = useState(hoyISO())
  const [dias, setDias] = useState(base && base.dias ? base.dias : [2, 4])
  const [hora, setHora] = useState(base && base.hora ? base.hora : '18:00')
  const [precio, setPrecio] = useState(tarifa ? String(tarifa.precio) : '0')
  const [sesiones, setSesiones] = useState(tarifa && tarifa.limiteSesiones != null ? String(tarifa.limiteSesiones) : '')
  const [cobrar, setCobrar] = useState(true)
  const [error, setError] = useState('')

  const cambiarTarifa = (id) => {
    setTarifaId(id)
    const t = disponibles.find((x) => x.id === id)
    if (t) {
      setPrecio(String(t.precio))
      setSesiones(t.limiteSesiones != null ? String(t.limiteSesiones) : '')
      if (t.modo === 'fija' && t.limiteSesiones != null) {
        const porSemana = Math.max(1, Math.round(t.limiteSesiones / 4))
        if (dias.length !== porSemana) setDias(sugerirDias(porSemana))
      }
    }
    setError('')
  }

  const toggleDia = (d) => {
    const nuevos = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort()
    setDias(nuevos)
    if (tarifa && tarifa.modo === 'fija') setSesiones(String(nuevos.length * 4))
  }

  const guardar = () => {
    if (!tarifa) return setError('Elige un plan')
    if (tarifa.modo === 'fija' && dias.length === 0) return setError('Selecciona al menos un día de clase')
    const lim = tarifa.limiteSesiones === null ? null : Number(sesiones)
    if (lim !== null && (!Number.isFinite(lim) || lim <= 0)) return setError('El número de clases debe ser mayor que cero')
    acc.crearPlan(
      {
        alumnoId: alumno.id,
        tarifaId: tarifa.id,
        nombreTarifa: tarifa.nombre,
        disciplina: tarifa.disciplina,
        modo: tarifa.modo,
        limiteSesiones: lim,
        duracionDias: tarifa.duracionDias || 28,
        fechaInicio,
        dias: tarifa.modo === 'fija' ? dias : [],
        hora: tarifa.modo === 'fija' ? hora : '',
        precio: Number(precio) || 0,
        moneda: tarifa.moneda || db.ajustes.moneda,
        compensarLluvia: db.ajustes.compensarLluviaIlimitado !== false,
      },
      cobrar
    )
    avisar(base ? 'Plan renovado' : 'Plan asignado')
    onCerrar()
  }

  return (
    <Modal titulo={base ? 'Renovar plan' : 'Asignar plan'} onCerrar={onCerrar}>
      <div className="campo">
        <label>Plan</label>
        <select value={tarifaId} onChange={(e) => cambiarTarifa(e.target.value)}>
          {disponibles.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre} — {fmtMonto(t.precio, t.moneda)}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label>Fecha de inicio</label>
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
      </div>

      {tarifa && tarifa.modo === 'fija' && (
        <>
          <div className="campo">
            <label>Días de clase</label>
            <div className="dias-sel">
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <button key={d} className={dias.includes(d) ? 'on' : ''} onClick={() => toggleDia(d)} type="button">
                  {DIAS_CORTOS[d]}
                </button>
              ))}
            </div>
            <div className="ayuda">
              {dias.length} por semana · el plan queda en {dias.length * 4} clases sobre 4 semanas.
            </div>
          </div>

          <div className="campo">
            <label>Horario</label>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </>
      )}

      {tarifa && tarifa.limiteSesiones !== null && (
        <div className="campo">
          <label>Total de clases</label>
          <input type="number" value={sesiones} onChange={(e) => setSesiones(e.target.value)} inputMode="numeric" />
          <div className="ayuda">Se calcula solo, pero puedes cambiarlo si acordaste otra cosa.</div>
        </div>
      )}

      {tarifa && tarifa.limiteSesiones === null && (
        <div className="aviso-caja" style={{ marginTop: 0, marginBottom: 14 }}>
          Plan ilimitado: no cuenta sesiones. Vence solo por fecha, a los {tarifa.duracionDias || 28} días.
        </div>
      )}

      <div className="campo">
        <label>Precio para este alumno</label>
        <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" />
        <div className="ayuda">El monto queda congelado en el cargo aunque después subas la tarifa.</div>
      </div>

      <div className="campo">
        <label>
          <input
            type="checkbox"
            checked={cobrar}
            onChange={(e) => setCobrar(e.target.checked)}
            style={{ width: 'auto', minHeight: 0, marginRight: 8, verticalAlign: 'middle' }}
          />
          Generar el cargo en su cuenta
        </label>
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <button className="btn pri full" onClick={guardar}>
        {base ? 'Renovar' : 'Asignar plan'}
      </button>
    </Modal>
  )
}

function sugerirDias(porSemana) {
  const mapa = { 1: [3], 2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6] }
  return mapa[porSemana] || [2, 4]
}

function FormAjuste({ acc, plan, onCerrar, avisar }) {
  const [sesiones, setSesiones] = useState('0')
  const [dias, setDias] = useState('0')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  const guardar = () => {
    const s = Number(sesiones) || 0
    const d = Number(dias) || 0
    if (s === 0 && d === 0) return setError('Indica cuántas clases o días quieres sumar o restar')
    if (!motivo.trim()) return setError('Escribe el motivo: sin motivo no vas a recordar por qué lo cambiaste')
    acc.ajustarPlan(plan.id, { sesiones: s, dias: d, motivo: motivo.trim() })
    avisar('Ajuste registrado')
    onCerrar()
  }

  return (
    <Modal titulo="Ajustar plan" onCerrar={onCerrar}>
      <p className="mini" style={{ marginTop: 0 }}>
        Todo ajuste queda en el historial con su motivo. Las suspensiones por lluvia ya se corren solas: esto es para
        casos especiales.
      </p>
      <div className="dos">
        <div className="campo">
          <label>Clases (+ / −)</label>
          <input type="number" value={sesiones} onChange={(e) => setSesiones(e.target.value)} inputMode="numeric" />
        </div>
        <div className="campo">
          <label>Días (+ / −)</label>
          <input type="number" value={dias} onChange={(e) => setDias(e.target.value)} inputMode="numeric" />
        </div>
      </div>
      <div className="campo">
        <label>Motivo</label>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Viaje, acuerdo, promoción..." />
      </div>
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}
      <button className="btn pri full" onClick={guardar}>
        Guardar ajuste
      </button>
    </Modal>
  )
}

function FormCargo({ db, acc, alumno, onCerrar, avisar }) {
  const [concepto, setConcepto] = useState('Clase particular')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState(db.ajustes.moneda || 'USD')
  const [fecha, setFecha] = useState(hoyISO())
  const [error, setError] = useState('')

  const guardar = () => {
    if (!concepto.trim()) return setError('Escribe el concepto')
    const m = Number(monto)
    if (!Number.isFinite(m) || m <= 0) return setError('El monto debe ser mayor que cero')
    acc.agregarCargo({ alumnoId: alumno.id, concepto: concepto.trim(), monto: m, moneda, fecha, planId: null })
    avisar('Cargo agregado')
    onCerrar()
  }

  return (
    <Modal titulo="Nuevo cargo" onCerrar={onCerrar}>
      <div className="campo">
        <label>Concepto</label>
        <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Clase particular, torneo, paleta..." />
      </div>
      <div className="dos">
        <div className="campo">
          <label>Monto</label>
          <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" placeholder="25" />
        </div>
        <div className="campo">
          <label>Moneda</label>
          <input value={moneda} onChange={(e) => setMoneda(e.target.value.toUpperCase())} />
        </div>
      </div>
      <div className="campo">
        <label>Fecha</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}
      <button className="btn pri full" onClick={guardar}>
        Agregar cargo
      </button>
    </Modal>
  )
}

function FormPago({ db, acc, alumno, onCerrar, avisar }) {
  const saldo = saldoAlumno(db, alumno.id)
  const monedas = Object.keys(saldo)
  const [monto, setMonto] = useState(monedas.length ? String(Math.max(0, saldo[monedas[0]])) : '')
  const [moneda, setMoneda] = useState(monedas[0] || db.ajustes.moneda || 'USD')
  const [metodo, setMetodo] = useState(METODOS[0])
  const [fecha, setFecha] = useState(hoyISO())
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')

  const guardar = () => {
    const m = Number(monto)
    if (!Number.isFinite(m) || m <= 0) return setError('El monto debe ser mayor que cero')
    acc.agregarPago({ alumnoId: alumno.id, monto: m, moneda, metodo, fecha, nota: nota.trim() })
    avisar('Pago registrado')
    onCerrar()
  }

  return (
    <Modal titulo="Registrar pago" onCerrar={onCerrar}>
      {monedas.length ? <div className="veredicto" style={{ marginTop: 0, marginBottom: 14 }}>Pendiente: {fmtSaldo(saldo)}</div> : null}
      <div className="dos">
        <div className="campo">
          <label>Monto</label>
          <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" />
        </div>
        <div className="campo">
          <label>Moneda</label>
          <input value={moneda} onChange={(e) => setMoneda(e.target.value.toUpperCase())} />
        </div>
      </div>
      <div className="campo">
        <label>Método</label>
        <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          {METODOS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label>Fecha</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="campo">
        <label>Nota</label>
        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Referencia, abono parcial..." />
      </div>
      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}
      <button className="btn pri full" onClick={guardar}>
        Registrar pago
      </button>
    </Modal>
  )
}
