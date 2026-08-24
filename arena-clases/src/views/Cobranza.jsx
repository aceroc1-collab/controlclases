import React, { useState, useMemo } from 'react'
import { Avatar, Vacio } from '../components/UI.jsx'
import EnviarWA from '../components/EnviarWA.jsx'
import { panelCobranza, saldoTotalPositivo } from '../lib/motor.js'
import { fmtMonto, fmtSaldo } from '../lib/mensajes.js'
import { fmtCorta, hoyISO, diffDias } from '../lib/fecha.js'

export default function Cobranza({ db, acc, irAlumno, avisar }) {
  const [wa, setWA] = useState(null)
  const { vencidos, porVencer, conDeuda } = useMemo(() => panelCobranza(db), [db])

  const totales = {}
  conDeuda.forEach((d) => {
    Object.entries(d.saldo).forEach(([m, v]) => {
      if (v > 0) totales[m] = (totales[m] || 0) + v
    })
  })

  const ultimoEnvio = (alumnoId) => {
    const evs = db.envios.filter((e) => e.alumnoId === alumnoId)
    return evs.length ? evs[evs.length - 1] : null
  }

  return (
    <>
      <div className="metricas">
        <div className="metrica acento">
          <div className="et">Por cobrar</div>
          <div className="val">
            {Object.keys(totales).length ? Object.entries(totales).map(([m, v]) => fmtMonto(v, m)).join(' · ') : '—'}
          </div>
        </div>
        <div className="metrica">
          <div className="et">Planes vencidos</div>
          <div className="val">{vencidos.length}</div>
        </div>
      </div>

      <Grupo
        titulo="Vencidos"
        vacio="Ningún plan vencido. Buen trabajo."
        items={vencidos}
        db={db}
        irAlumno={irAlumno}
        setWA={setWA}
        ultimoEnvio={ultimoEnvio}
        pintar={(est) => ({
          clase: 'rojo',
          txt: est.agotado ? 'Gastó las clases' : 'Se pasó la fecha',
          detalle: est.agotado
            ? `Consumió las ${est.total} clases`
            : `Cerró el ${fmtCorta(est.fechaFin)} · ${diffDias(est.fechaFin, hoyISO())} días de mora`,
        })}
      />

      <Grupo
        titulo="Por vencer"
        vacio="Nadie está cerca de vencer esta semana."
        items={porVencer}
        db={db}
        irAlumno={irAlumno}
        setWA={setWA}
        ultimoEnvio={ultimoEnvio}
        pintar={(est) => ({
          clase: 'oro',
          txt: est.ilimitado ? 'Solo fecha' : est.venceP === 'clases' ? 'Por clases' : 'Por fecha',
          detalle: est.ilimitado
            ? `Quedan ${est.diasRestantes} días`
            : est.venceP === 'clases'
              ? `Queda${est.restantes === 1 ? '' : 'n'} ${est.restantes} clase${est.restantes === 1 ? '' : 's'}`
              : `Vence el ${fmtCorta(est.fechaFin)} · ${est.diasRestantes} días`,
        })}
      />

      <div className="seccion">
        <h2>Deuda en cuenta</h2>
        {conDeuda.length === 0 ? (
          <div className="mini" style={{ marginTop: 10 }}>
            Nadie tiene saldo pendiente.
          </div>
        ) : (
          <div className="card" style={{ marginTop: 12 }}>
            {conDeuda.map(({ alumno, saldo }) => (
              <div className="lista-item" key={alumno.id}>
                <div onClick={() => irAlumno(alumno.id)}>
                  <Avatar nombre={alumno.nombre} disciplina={alumno.disciplina} />
                </div>
                <div className="crece" onClick={() => irAlumno(alumno.id)}>
                  <div className="nombre">{alumno.nombre}</div>
                  <div className="sub">{fmtSaldo(saldo)}</div>
                </div>
                <button className="btn wa chico" onClick={() => setWA({ alumno, plan: null, estado: null })}>
                  Cobrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {wa && (
        <EnviarWA
          db={db}
          acc={acc}
          alumno={wa.alumno}
          plan={wa.plan}
          estado={wa.estado}
          onCerrar={() => setWA(null)}
          avisar={avisar}
        />
      )}
    </>
  )
}

function Grupo({ titulo, vacio, items, db, irAlumno, setWA, pintar, ultimoEnvio }) {
  return (
    <div className="seccion">
      <div className="seccion-titulo">
        <h2>{titulo}</h2>
        <span className="tag">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="mini">{vacio}</div>
      ) : (
        items.map(({ plan, alumno, estado, saldo }) => {
          const p = pintar(estado)
          const envio = ultimoEnvio(alumno.id)
          const debe = saldoTotalPositivo(saldo)
          return (
            <div className="card" key={plan.id}>
              <div className="fila">
                <div onClick={() => irAlumno(alumno.id)}>
                  <Avatar nombre={alumno.nombre} disciplina={plan.disciplina} />
                </div>
                <div className="crece" onClick={() => irAlumno(alumno.id)} style={{ cursor: 'pointer' }}>
                  <div className="nombre">{alumno.nombre}</div>
                  <div className="sub">
                    {plan.nombreTarifa} · {p.detalle}
                  </div>
                </div>
                <span className={'tag ' + p.clase}>{p.txt}</span>
              </div>

              <div className="fila fila-sep" style={{ marginTop: 10 }}>
                <div className="mini">
                  {debe > 0 ? `Debe ${fmtSaldo(saldo)}` : 'Sin deuda en cuenta'}
                  {envio ? ` · avisado el ${fmtCorta(envio.fecha)}` : ' · sin avisar'}
                </div>
                <button className="btn wa chico" onClick={() => setWA({ alumno, plan, estado })}>
                  Avisar
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
