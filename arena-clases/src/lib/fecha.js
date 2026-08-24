export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function hoyISO() {
  return aISO(new Date())
}

export function aISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function deISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function sumarDias(iso, n) {
  const d = deISO(iso)
  d.setDate(d.getDate() + n)
  return aISO(d)
}

export function diaSemana(iso) {
  return deISO(iso).getDay()
}

export function diffDias(desdeISO, hastaISO) {
  const a = deISO(desdeISO)
  const b = deISO(hastaISO)
  return Math.round((b - a) / 86400000)
}

export function fmtCorta(iso) {
  if (!iso) return '—'
  const d = deISO(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}

export function fmtLarga(iso) {
  if (!iso) return '—'
  const d = deISO(iso)
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`
}

export function fmtMes(iso) {
  const d = deISO(iso)
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`
}

export function inicioMes(iso) {
  const d = deISO(iso)
  return aISO(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function finMes(iso) {
  const d = deISO(iso)
  return aISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function mesAnterior(iso) {
  const d = deISO(iso)
  return aISO(new Date(d.getFullYear(), d.getMonth() - 1, 1))
}

export function mesSiguiente(iso) {
  const d = deISO(iso)
  return aISO(new Date(d.getFullYear(), d.getMonth() + 1, 1))
}

export function enRango(iso, desde, hasta) {
  return iso >= desde && iso <= hasta
}

export function fmtHora(h) {
  if (!h) return ''
  const [hh, mm] = h.split(':').map(Number)
  const ampm = hh >= 12 ? 'pm' : 'am'
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return mm === 0 ? `${h12}${ampm}` : `${h12}:${String(mm).padStart(2, '0')}${ampm}`
}
