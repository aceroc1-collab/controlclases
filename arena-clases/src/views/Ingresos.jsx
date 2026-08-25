import React, { useState, useMemo } from 'react'
import { Avatar } from '../components/UI.jsx'
import { proyeccionMes, usoIlimitado, ocupacionPorBloque } from '../lib/motor.js'
import { fmtMonto } from '../lib/mensajes.js'
import { hoyISO, inicioMes, finMes, mesAnterior, mesSiguiente, fmtMes, fmtCorta } from '../lib/fecha.js'

export default function Ingresos({ db, irAlumno }) {
  const [ancla, setAncla] = useState(inicioMes(hoyISO()))
  const desde = inicioMes(ancla)
  const hasta = finMes(ancla)

  const { porMoneda, detalle } = useMemo(() => proyeccionMes(db, desde, hasta), [db, desde, hasta])
  const uso = useMemo(() => usoIlimitado(db), [db])
  const ocupacion = useMemo(() => ocupacionPorBloque(db, desde, hasta), [db, desde, hasta])

  const monedas = Object.keys(porMoneda)

  return (
    <>
      <div className="fila fila-sep" style={{ marginBottom: 16 }}>
        <button className="btn fantasma chico" onClick={() => setAncla(mesAnterior(ancla))} aria-label="Mes anterior">
          ‹
        </button>
        <div style={{ fontWeight: 800, fontFamily: 'Archivo, sans-serif', textTransform: 'capitalize' }}>
          {fmtMes(desde)}
        </div>
        <button className="btn fantasma chico" onClick={() => setAncla(mesSiguiente(ancla))} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      {monedas.length === 0 ? (
        <div className="mini">Sin planes ni pagos en este mes.</div>
      ) : (
        monedas.map((m) => {
          const d = porMoneda[m]
          const base = Math.max(1, d.comprometido)
          const pctCobrado = Math.min(100, (Math.max(0, d.cobrado) / base) * 100)
          const pctRiesgo = Math.min(100 - pctCobrado, (Math.max(0, d.enRiesgo) / base) * 100)
          const pctPorCobrar = Math.max(0, 100 - pctCobrado - pctRiesgo)
          return (
            <div key={m} style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{m}</div>
              <div className="metricas">
                <div className="metrica acento">
                  <div className="et">Comprometido</div>
                  <div className="val">{fmtMonto(d.comprometido, m)}</div>
                </div>
                <div className="metrica">
                  <div className="et">Cobrado</div>
                  <div className="val">{fmtMonto(d.cobrado, m)}</div>
                </div>
                <div className="metrica">
                  <div className="et">Por cobrar</div>
                  <div className="val">{fmtMonto(d.porCobrar, m)}</div>
                </div>
                <div className="metrica">
                  <div className="et">En riesgo</div>
                  <div className="val">{fmtMonto(d.enRiesgo, m)}</div>
                </div>
              </div>
              <div className="barra-segmentada" style={{ marginTop: 12 }}>
                <span className="seg-cobrado" style={{ width: `${pctCobrado}%` }} />
                <span className="seg-riesgo" style={{ width: `${pctRiesgo}%` }} />
                <span className="seg-porcobrar" style={{ width: `${pctPorCobrar}%` }} />
              </div>
              <div className="barra-leyenda">
                <span><i style={{ background: 'var(--verde)' }} />Cobrado</span>
                <span><i style={{ background: 'var(--rojo)' }} />En riesgo</span>
                <span><i style={{ background: 'var(--tinta-3)' }} />Por cobrar</span>
              </div>
              <div className="mini" style={{ marginTop: 8 }}>
                Confirmado {fmtMonto(d.confirmado, m)} · estimado {fmtMonto(d.estimado, m)}. Los planes por sesiones son
                estimados porque pueden agotarse antes de la fecha.
              </div>
            </div>
          )
        })
      )}

      <div className="seccion">
        <h2>Renovaciones del mes</h2>
        {detalle.length === 0 ? (
          <div className="mini" style={{ marginTop: 10 }}>
            No hay renovaciones proyectadas en este mes.
          </div>
        ) : (
          <div className="card" style={{ marginTop: 12 }}>
            {detalle.map(({ alumno, plan, estado, fechaRenov, monto }) => (
              <div className="lista-item" key={plan.id} onClick={() => irAlumno(alumno.id)}>
                <Avatar nombre={alumno.nombre} disciplina={plan.disciplina} />
                <div className="crece">
                  <div className="nombre">{alumno.nombre}</div>
                  <div className="sub">
                    {plan.nombreTarifa} · {estado.venceP === 'clases' ? 'por clases' : 'por fecha'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontFamily: 'Archivo, sans-serif' }}>{fmtMonto(monto, plan.moneda)}</div>
                  <div className="mini">{fmtCorta(fechaRenov)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {uso && (
        <div className="seccion">
          <h2>Uso del ilimitado</h2>
          <div className="metricas" style={{ marginTop: 12 }}>
            <div className="metrica">
              <div className="et">Planes activos</div>
              <div className="val">{uso.planes}</div>
            </div>
            <div className="metrica">
              <div className="et">Asistencias / semana</div>
              <div className="val">{uso.promedioSemana}</div>
            </div>
          </div>
          <div className="aviso-caja">
            El ilimitado es buen negocio mientras sobre espacio en la arena. Si el promedio semanal se acerca al de un
            plan de 12 sesiones, o si te está llenando un bloque y rechazas gente, toca revisar el precio.
          </div>
        </div>
      )}

      {ocupacion.length > 0 && (
        <div className="seccion">
          <h2>Ocupación por bloque</h2>
          <div className="card" style={{ marginTop: 12 }}>
            {ocupacion.map((o, i) => {
              const max = Math.max(...ocupacion.map((x) => x.n))
              return (
                <div key={o.clave} style={{ marginTop: i === 0 ? 0 : 12 }}>
                  <div className="fila fila-sep" style={{ marginBottom: 4 }}>
                    <span className="mini" style={{ textTransform: 'capitalize' }}>{o.clave.replace('tenis', 'beach tennis')}</span>
                    <b style={{ fontFamily: 'Archivo, sans-serif', fontSize: 13 }}>{o.n}</b>
                  </div>
                  <div className="barra ancha">
                    <span style={{ width: `${(o.n / max) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
