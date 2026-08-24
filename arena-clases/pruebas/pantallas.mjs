import React from 'react'
import { renderToString } from 'react-dom/server'
import { dbVacia, uid } from '../src/lib/db.js'
import { crearAcciones } from '../src/lib/acciones.js'
import { hoyISO, sumarDias } from '../src/lib/fecha.js'
import Hoy from '../src/views/Hoy.jsx'
import Alumnos from '../src/views/Alumnos.jsx'
import AlumnoDetalle from '../src/views/AlumnoDetalle.jsx'
import Cobranza from '../src/views/Cobranza.jsx'
import Ingresos from '../src/views/Ingresos.jsx'
import Ajustes from '../src/views/Ajustes.jsx'
import { Entrar } from '../src/components/Sesion.jsx'
import Informe from '../src/components/Informe.jsx'

let db = dbVacia()
const tBT = db.tarifas.find((t) => t.modo === 'fija')
const tSes = db.tarifas.find((t) => t.modo === 'libre' && t.limiteSesiones !== null)
const tIli = db.tarifas.find((t) => t.limiteSesiones === null)

const a1 = { id: uid(), nombre: 'María González', telefono: '+584121234567', disciplina: 'tenis', activo: true }
const a2 = { id: uid(), nombre: 'José Pérez', telefono: '04141112233', disciplina: 'funcional', activo: true }
const a3 = { id: uid(), nombre: 'Ana Ruiz', telefono: '', disciplina: 'funcional', activo: true }
db.alumnos = [a1, a2, a3]

const hoy = hoyISO()
const dow = new Date().getDay()
db.planes = [
  { id: 'x1', alumnoId: a1.id, tarifaId: tBT.id, nombreTarifa: tBT.nombre, disciplina: 'tenis', modo: 'fija',
    limiteSesiones: 8, duracionDias: 28, fechaInicio: sumarDias(hoy, -10), dias: [dow, (dow + 2) % 7], hora: '18:00',
    precio: 40, moneda: 'USD', estado: 'activo', ajusteSesiones: 0, ajusteDias: 0 },
  { id: 'x2', alumnoId: a2.id, tarifaId: tSes.id, nombreTarifa: tSes.nombre, disciplina: 'funcional', modo: 'libre',
    limiteSesiones: 12, duracionDias: 28, fechaInicio: sumarDias(hoy, -20), dias: [], hora: '',
    precio: 40, moneda: 'USD', estado: 'activo', ajusteSesiones: 0, ajusteDias: 0 },
  { id: 'x3', alumnoId: a3.id, tarifaId: tIli.id, nombreTarifa: tIli.nombre, disciplina: 'funcional', modo: 'libre',
    limiteSesiones: null, duracionDias: 28, fechaInicio: sumarDias(hoy, -40), dias: [], hora: '',
    precio: 50, moneda: 'USD', estado: 'activo', ajusteSesiones: 0, ajusteDias: 0 },
]
db.eventos = [
  { id: 'e1', planId: 'x2', fecha: sumarDias(hoy, -3), tipo: 'asistio' },
  { id: 'e2', planId: 'x1', fecha: sumarDias(hoy, -8), tipo: 'falto' },
  { id: 'e3', planId: 'x3', fecha: sumarDias(hoy, -5), tipo: 'asistio' },
]
db.cargos = [{ id: 'c1', alumnoId: a1.id, concepto: 'Clase particular', monto: 25, moneda: 'USD', fecha: hoy, planId: null }]
db.pagos = [{ id: 'g1', alumnoId: a2.id, monto: 40, moneda: 'USD', metodo: 'Zelle', fecha: hoy, nota: '' }]
db.suspensiones = [{ id: 's1', disciplina: 'funcional', fecha: sumarDias(hoy, -2), hora: null, motivo: 'Lluvia' }]


const acc = crearAcciones(() => {})
const avisar = () => {}
const sesion = { user: { id: 'coach-1', email: 'coach@test.com' } }
const sync = { estado: 'ok', cuando: new Date().toISOString() }

const pruebas = [
  ['Hoy', React.createElement(Hoy, { db, acc, irAlumno: () => {}, avisar })],
  ['Alumnos', React.createElement(Alumnos, { db, acc, irAlumno: () => {}, avisar })],
  ['Ficha beach tennis', React.createElement(AlumnoDetalle, { db, acc, alumnoId: a1.id, volver: () => {}, avisar })],
  ['Ficha funcional sesiones', React.createElement(AlumnoDetalle, { db, acc, alumnoId: a2.id, volver: () => {}, avisar })],
  ['Ficha ilimitado vencido', React.createElement(AlumnoDetalle, { db, acc, alumnoId: a3.id, volver: () => {}, avisar })],
  ['Cobranza', React.createElement(Cobranza, { db, acc, irAlumno: () => {}, avisar })],
  ['Ingresos', React.createElement(Ingresos, { db, irAlumno: () => {} })],
  ['Ajustes con sesión', React.createElement(Ajustes, { db, acc, avisar, sesion, sync, onSincronizar: () => {}, onConectar: () => {} })],
  ['Ajustes sin sesión', React.createElement(Ajustes, { db, acc, avisar, sesion: null, sync, onSincronizar: () => {}, onConectar: () => {} })],
  ['Inicio de sesión', React.createElement(Entrar, { onLocal: () => {} })],
  ['Informe beach tennis', React.createElement(Informe, { db, acc, alumno: a1, onCerrar: () => {}, avisar })],
  ['Informe ilimitado', React.createElement(Informe, { db, acc, alumno: a3, onCerrar: () => {}, avisar })],
]

let fallos = 0
for (const [nombre, el] of pruebas) {
  try {
    const html = renderToString(el)
    console.log(`  OK  ${nombre} (${html.length} caracteres)`)
  } catch (err) {
    fallos++
    console.log(` FALLA ${nombre}: ${err.message}`)
  }
}
console.log(fallos === 0 ? '\n✓ Todas las pantallas renderizan\n' : `\n✗ ${fallos} pantallas con error\n`)
process.exit(fallos ? 1 : 0)
