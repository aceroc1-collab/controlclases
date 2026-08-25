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

export function Avatar({ nombre, disciplina, foto, anillo }) {
  const iniciales = (nombre || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  const clase =
    'avatar' +
    (disciplina === 'funcional' && !foto ? ' func' : '') +
    (anillo ? ' anillo-' + anillo : '')
  return <div className={clase}>{foto ? <img src={foto} alt="" /> : iniciales}</div>
}

// Icono de trazo fino por defecto para los estados vacíos: una pelota de
// beach tennis esquemática, coherente con la cinta de cancha del resto de la app.
function IconoVacio() {
  return (
    <svg className="vacio-icono" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M4.5 8.5c2.5 1.6 5 1.6 7.5 0s5-1.6 7.5 0" />
      <path d="M4.5 15.5c2.5-1.6 5-1.6 7.5 0s5 1.6 7.5 0" />
    </svg>
  )
}

export function Vacio({ titulo, texto, children, icono }) {
  return (
    <div className="vacio">
      {icono === null ? null : icono || <IconoVacio />}
      <h3>{titulo}</h3>
      <div className="mini">{texto}</div>
      {children ? <div style={{ marginTop: 14 }}>{children}</div> : null}
    </div>
  )
}

// Set de iconos del nav inferior: trazo fino, coherente entre sí y con la
// identidad de la app, en vez de glifos unicode que varían según el sistema.
export function Icono({ nombre }) {
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (nombre === 'hoy')
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" />
      </svg>
    )
  if (nombre === 'alumnos')
    return (
      <svg {...props}>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <circle cx="17" cy="9" r="2.3" />
        <path d="M15.7 14.2c2.3.3 4.3 2 4.3 4.8" />
      </svg>
    )
  if (nombre === 'cobranza')
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.6" fill="currentColor" />
      </svg>
    )
  if (nombre === 'ingresos')
    return (
      <svg {...props}>
        <path d="M4 20V10M11 20V4M18 20v-7" />
        <path d="M2.5 20h19" />
      </svg>
    )
  if (nombre === 'ajustes')
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6M17.9 17.9l-1.6-1.6M7.7 7.7 6.1 6.1" />
      </svg>
    )
  return null
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

/** Porcentajes de vigencia y consumo, y cuál de los dos va ganando la carrera al vencimiento. */
export function calcularPcts(plan, est) {
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
  return { diasTotales, pctDias, pctClases, lidera }
}

// Barra angosta para filas de lista: la versión de un solo trazo del doble
// contador, cuando no hay espacio (o falta) para las dos barras completas.
export function MiniBarra({ pct, tono }) {
  return (
    <div className="barra mini">
      <span
        className={tono ? 'tono-' + tono : ''}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

/** El doble contador: la vigencia y el consumo compitiendo. */
export function DobleContador({ plan, est }) {
  const { diasTotales, pctDias, pctClases, lidera } = calcularPcts(plan, est)

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
