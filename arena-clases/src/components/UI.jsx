import React, { useEffect } from 'react'
import { fmtCorta, fmtHora, hoyISO, DIAS_CORTOS } from '../lib/fecha.js'

export function Modal({ titulo, onCerrar, children }) {
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', esc)
    }
  }, [onCerrar])

  return (
    <div className="overlay" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-agarre" />
        <div className="modal-cab">
          <h2>{titulo}</h2>
          <button className="cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Avatar({ nombre, disciplina }) {
  const iniciales = (nombre || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return <div className={'avatar' + (disciplina === 'funcional' ? ' func' : '')}>{iniciales}</div>
}

export function Vacio({ titulo, texto, children }) {
  return (
    <div className="vacio">
      <h3>{titulo}</h3>
      <div className="mini">{texto}</div>
      {children ? <div style={{ marginTop: 14 }}>{children}</div> : null}
    </div>
  )
}

export function etiquetaPlan(plan, est) {
  if (est.ilimitado) return { txt: 'Solo fecha', clase: 'oro' }
  if (est.venceP === 'clases') return { txt: 'Vence por clases', clase: 'rojo' }
  return { txt: 'Vence por fecha', clase: '' }
}

export function descripcionHorario(plan) {
  if (plan.modo !== 'fija') return 'Horario libre'
  const dias = (plan.dias || []).map((d) => DIAS_CORTOS[d]).join(' · ')
  return `${dias} · ${fmtHora(plan.hora)}`
}

/** El doble contador: la vigencia y el consumo compitiendo. */
export function DobleContador({ plan, est }) {
  const diasTotales = est.ilimitado || plan.modo === 'libre' ? est.duracionDias : null
  let pctDias
  if (plan.modo === 'fija') {
    const total = Math.max(1, est.fechas.length)
    const pasadas = est.fechas.filter((f) => f <= hoyISO()).length
    pctDias = Math.min(100, (pasadas / total) * 100)
  } else {
    const usados = Math.max(0, est.duracionDias - Math.max(0, est.diasRestantes))
    pctDias = Math.min(100, (usados / Math.max(1, est.duracionDias)) * 100)
  }
  const pctClases = est.ilimitado ? 0 : Math.min(100, (est.consumidas / Math.max(1, est.total)) * 100)
  const lidera = est.venceP === 'clases' ? 'clases' : 'fecha'

  return (
    <div className="gauges">
      <div className={'gauge' + (lidera === 'fecha' ? ' lider' : '') + (est.caducado ? ' critico' : '')}>
        <div className="gauge-top">
          <span>Vigencia · {est.ilimitado || plan.modo === 'libre' ? `${diasTotales} días` : 'agenda'}</span>
          <b>
            {est.diasRestantes >= 0 ? `${est.diasRestantes} d restantes` : `vencido hace ${-est.diasRestantes} d`}
          </b>
        </div>
        <div className="barra">
          <span style={{ width: `${pctDias}%` }} />
        </div>
      </div>

      {est.ilimitado ? (
        <div className="gauge">
          <div className="gauge-top">
            <span>Asistencias del ciclo</span>
            <b>{est.asistencias}</b>
          </div>
        </div>
      ) : (
        <div className={'gauge' + (lidera === 'clases' ? ' lider' : '') + (est.agotado ? ' critico' : '')}>
          <div className="gauge-top">
            <span>Clases consumidas</span>
            <b>
              {est.consumidas} de {est.total}
            </b>
          </div>
          <div className="barra">
            <span style={{ width: `${pctClases}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

export function Veredicto({ est }) {
  if (est.agotado) {
    return (
      <div className="veredicto malo">
        <b>Vencido por consumo</b> — gastó las {est.total} clases. Toca renovar.
      </div>
    )
  }
  if (est.caducado) {
    return (
      <div className="veredicto malo">
        <b>Vencido por fecha</b> — cerró el {fmtCorta(est.fechaFin)}
        {est.restantes > 0 ? ` con ${est.restantes} clase${est.restantes === 1 ? '' : 's'} sin usar` : ''}.
      </div>
    )
  }
  if (est.ilimitado) {
    return (
      <div className={'veredicto' + (est.diasRestantes <= 3 ? ' aviso' : ' bien')}>
        <b>Mensual ilimitado</b> — vence el {fmtCorta(est.fechaFin)}, quedan {est.diasRestantes} días.
      </div>
    )
  }
  if (est.venceP === 'clases') {
    return (
      <div className={'veredicto' + (est.restantes <= 2 ? ' aviso' : '')}>
        <b>Vence por clases</b> — {est.restantes === 1 ? 'le queda 1 clase' : `le quedan ${est.restantes} clases`}, cierra
        cerca del {fmtCorta(est.fechaProyectada)}. Fecha límite: {fmtCorta(est.fechaFin)}.
      </div>
    )
  }
  return (
    <div className={'veredicto' + (est.diasRestantes <= 3 ? ' aviso' : '')}>
      <b>Vence por fecha</b> — {fmtCorta(est.fechaFin)}, quedan {est.diasRestantes} días y {est.restantes} clases.
      {est.saltadas.length ? ` Corrido +${est.saltadas.length} por suspensión.` : ''}
    </div>
  )
}
