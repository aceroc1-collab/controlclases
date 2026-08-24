import { estadoPlan } from '../src/lib/motor.js'
import { fmtLarga } from '../src/lib/fecha.js'

let fallos = 0
function check(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`${ok ? '  OK ' : ' FALLA'} ${nombre}${ok ? '' : `\n         esperado: ${esperado}\n         obtenido: ${real}`}`)
}

const planBT = {
  id: 'p1',
  disciplina: 'tenis',
  modo: 'fija',
  limiteSesiones: 8,
  duracionDias: 28,
  fechaInicio: '2026-08-04', // martes
  dias: [2, 4], // martes y jueves
  hora: '18:00',
  ajusteSesiones: 0,
  ajusteDias: 0,
}

console.log('\n--- 1. Plan de beach tennis 2x semana, 8 clases ---')
let e = estadoPlan(planBT, [], [], '2026-08-04')
console.log('  Sesiones:', e.fechas.map((f) => fmtLarga(f)).join(', '))
check('son 8 sesiones', e.fechas.length, 8)
check('primera es el inicio', e.fechas[0], '2026-08-04')
check('cierra el jue 27 ago', e.fechaFin, '2026-08-27')
check('vence por fecha', e.venceP, 'fecha')

console.log('\n--- 2. Faltar consume igual ---')
e = estadoPlan(planBT, [{ planId: 'p1', fecha: '2026-08-06', tipo: 'falto' }], [], '2026-08-07')
check('consumidas = 2 (mar y jue ya pasaron)', e.consumidas, 2)
check('restantes = 6', e.restantes, 6)
check('la fecha de cierre no se mueve', e.fechaFin, '2026-08-27')

console.log('\n--- 3. Lluvia: corre la fecha una sesión ---')
const lluvia = [{ id: 's1', disciplina: 'tenis', fecha: '2026-08-13', hora: '18:00', motivo: 'Lluvia' }]
e = estadoPlan(planBT, [], lluvia, '2026-08-14')
check('la sesión suspendida no cuenta', e.fechas.includes('2026-08-13'), false)
check('siguen siendo 8 sesiones', e.fechas.length, 8)
check('cierra un slot después: mar 1 sep', e.fechaFin, '2026-09-01')
check('registra la suspensión', e.saltadas, ['2026-08-13'])

console.log('\n--- 4. Adelantar clases: vence antes por consumo ---')
const extras = [
  { planId: 'p1', fecha: '2026-08-05', tipo: 'extra' },
  { planId: 'p1', fecha: '2026-08-07', tipo: 'extra' },
  { planId: 'p1', fecha: '2026-08-12', tipo: 'extra' },
]
e = estadoPlan(planBT, extras, [], '2026-08-13')
check('consumidas = 4 programadas + 3 extras', e.consumidas, 7)
check('le queda 1 clase', e.restantes, 1)
check('la fecha límite sigue igual', e.fechaFin, '2026-08-27')
check('ahora vence por clases', e.venceP, 'clases')
check('cerrará el mar 18 ago', e.fechaProyectada, '2026-08-18')

console.log('\n--- 5. Agotado por consumo ---')
const ocho = Array.from({ length: 4 }, (_, i) => ({ planId: 'p1', fecha: '2026-08-1' + i, tipo: 'extra' }))
e = estadoPlan(planBT, ocho, [], '2026-08-13')
check('consumidas topa en 8', e.consumidas, 8)
check('vencido', e.vencido, true)
check('agotado, no caducado', [e.agotado, e.caducado], [true, false])

console.log('\n--- 6. Funcional por sesiones (horario libre) ---')
const planFunc = {
  id: 'p2',
  disciplina: 'funcional',
  modo: 'libre',
  limiteSesiones: 12,
  duracionDias: 28,
  fechaInicio: '2026-08-01',
  dias: [],
  hora: '',
}
e = estadoPlan(planFunc, [], [], '2026-08-10')
check('no viene = no consume', e.consumidas, 0)
check('vence a los 28 días', e.fechaFin, '2026-08-28')
const asis = Array.from({ length: 5 }, (_, i) => ({ planId: 'p2', fecha: '2026-08-0' + (i + 2), tipo: 'asistio' }))
e = estadoPlan(planFunc, asis, [], '2026-08-10')
check('5 asistencias descuentan 5', e.consumidas, 5)
check('quedan 7', e.restantes, 7)

console.log('\n--- 7. Funcional mensual ilimitado ---')
const planIlim = { ...planFunc, id: 'p3', limiteSesiones: null, compensarLluvia: true }
const muchas = Array.from({ length: 14 }, (_, i) => ({ planId: 'p3', fecha: '2026-08-05', tipo: 'asistio' }))
e = estadoPlan(planIlim, muchas, [], '2026-08-15')
check('es ilimitado', e.ilimitado, true)
check('no consume nada', e.consumidas, 0)
check('restantes es nulo', e.restantes, null)
check('registra las asistencias', e.asistencias, 14)
check('vence solo por fecha', e.venceP, 'fecha')
check('cierra el 28 ago', e.fechaFin, '2026-08-28')

console.log('\n--- 8. Ilimitado: día completo suspendido suma un día ---')
const diaCompleto = [{ id: 's2', disciplina: 'funcional', fecha: '2026-08-10', hora: null, motivo: 'Lluvia' }]
e = estadoPlan(planIlim, [], diaCompleto, '2026-08-15')
check('la vigencia se corre un día', e.fechaFin, '2026-08-29')

console.log('\n--- 9. Ajustes manuales ---')
e = estadoPlan({ ...planBT, ajusteSesiones: 2 }, [], [], '2026-08-04')
check('+2 clases = 10 en total', e.total, 10)
check('la fecha se extiende a esas sesiones', e.fechaFin, '2026-09-03')
e = estadoPlan({ ...planBT, ajusteDias: 5 }, [], [], '2026-08-04')
check('+5 días corre el cierre', e.fechaFin, '2026-09-01')

console.log('\n--- 10. Caducado con clases sin usar ---')
e = estadoPlan(planFunc, asis, [], '2026-09-05')
check('vencido por fecha', [e.vencido, e.caducado], [true, true])
check('pierde las 7 que no usó', e.restantes, 7)

console.log(fallos === 0 ? '\n✓ Todas las pruebas pasaron\n' : `\n✗ ${fallos} pruebas fallaron\n`)
process.exit(fallos === 0 ? 0 : 1)
