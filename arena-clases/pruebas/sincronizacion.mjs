import { dbVacia, uid } from '../src/lib/db.js'
import { crearAcciones } from '../src/lib/acciones.js'
import { sincronizar } from '../src/lib/sync.js'
import { limpiarServidor, servidor } from './falso-supabase.js'

let fallos = 0
function check(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`${ok ? '  OK ' : ' FALLA'} ${nombre}${ok ? '' : `\n         esperado: ${JSON.stringify(esperado)}\n         obtenido: ${JSON.stringify(real)}`}`)
}

// Cada "dispositivo" tiene su propio almacenamiento local, igual que en la vida real.
function crearDispositivo(nombre) {
  const almacen = {}
  const disp = {
    nombre,
    almacen,
    db: dbVacia(),
    acc: null,
  }
  disp.acc = crearAcciones((fn) => {
    disp.db = typeof fn === 'function' ? fn(disp.db) : fn
  })
  return disp
}

function activar(disp) {
  global.localStorage = {
    getItem: (k) => (k in disp.almacen ? disp.almacen[k] : null),
    setItem: (k, v) => {
      disp.almacen[k] = String(v)
    },
    removeItem: (k) => {
      delete disp.almacen[k]
    },
  }
}

async function sync(disp) {
  activar(disp)
  const r = await sincronizar(disp.db)
  if (r.db) disp.db = r.db
  return r
}

async function correr() {
  limpiarServidor()
  const tel = crearDispositivo('teléfono')
  const pc = crearDispositivo('computadora')

  console.log('\n--- 1. El teléfono crea datos y los sube ---')
  activar(tel)
  tel.acc.guardarAlumno({ nombre: 'María González', telefono: '+584121234567', disciplina: 'tenis' })
  const maria = tel.db.alumnos[0]
  tel.acc.crearPlan(
    {
      alumnoId: maria.id,
      tarifaId: 't1',
      nombreTarifa: 'Beach tennis 2x semana',
      disciplina: 'tenis',
      modo: 'fija',
      limiteSesiones: 8,
      duracionDias: 28,
      fechaInicio: '2026-08-04',
      dias: [2, 4],
      hora: '18:00',
      precio: 40,
      moneda: 'USD',
    },
    true
  )
  let r = await sync(tel)
  check('la subida no falla', r.estado, 'ok')
  check('llegan alumno, plan, cargo y tarifas', servidor.filas.length >= 3, true)

  console.log('\n--- 2. La computadora baja todo por primera vez ---')
  r = await sync(pc)
  check('recibe al alumno', pc.db.alumnos.length, 1)
  check('con el mismo nombre', pc.db.alumnos[0].nombre, 'María González')
  check('recibe el plan', pc.db.planes.length, 1)
  check('recibe el cargo', pc.db.cargos.length, 1)
  check('recibe las tarifas iniciales', pc.db.tarifas.length, 6)

  console.log('\n--- 3. Sin cambios no hay ida y vuelta infinita ---')
  const filasAntes = servidor.filas.length
  r = await sync(tel)
  check('la segunda ronda no aplica cambios', r.db, null)
  r = await sync(pc)
  check('ni en el otro dispositivo', r.db, null)
  check('el servidor no crece solo', servidor.filas.length, filasAntes)

  console.log('\n--- 4. Paso lista en el teléfono, aparece en la computadora ---')
  activar(tel)
  tel.acc.registrarEvento(tel.db.planes[0].id, '2026-08-06', 'falto')
  await sync(tel)
  await sync(pc)
  check('la falta viajó', pc.db.eventos.length, 1)
  check('con el tipo correcto', pc.db.eventos[0].tipo, 'falto')

  console.log('\n--- 5. Registro un pago en la computadora, llega al teléfono ---')
  activar(pc)
  pc.acc.agregarPago({ alumnoId: maria.id, monto: 40, moneda: 'USD', metodo: 'Zelle', fecha: '2026-08-07', nota: '' })
  await sync(pc)
  await sync(tel)
  check('el pago viajó', tel.db.pagos.length, 1)
  check('por el monto correcto', tel.db.pagos[0].monto, 40)

  console.log('\n--- 6. Borrar en un lado borra en el otro ---')
  activar(tel)
  tel.acc.borrarCargo(tel.db.cargos[0].id)
  check('se registró la lápida', tel.db.borrados.length, 1)
  await sync(tel)
  check('la lápida se limpia tras subirla', tel.db.borrados.length, 0)
  await sync(pc)
  check('el cargo desapareció del otro dispositivo', pc.db.cargos.length, 0)

  console.log('\n--- 7. Editar lo mismo en ambos: gana la edición más reciente ---')
  activar(tel)
  tel.acc.guardarAlumno({ ...tel.db.alumnos[0], notas: 'escrito en el teléfono' })
  await new Promise((res) => setTimeout(res, 12))
  activar(pc)
  pc.acc.guardarAlumno({ ...pc.db.alumnos[0], notas: 'escrito después en la computadora' })
  await sync(tel)
  await sync(pc)
  await sync(tel)
  check('gana la más reciente en la computadora', pc.db.alumnos[0].notas, 'escrito después en la computadora')
  check('y el teléfono la adopta', tel.db.alumnos[0].notas, 'escrito después en la computadora')

  console.log('\n--- 8. Trabajar sin conexión y subir al volver ---')
  activar(tel)
  const online = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
  tel.acc.agregarCargo({ alumnoId: maria.id, concepto: 'Clase particular', monto: 25, moneda: 'USD', fecha: '2026-08-09' })
  tel.acc.registrarEvento(tel.db.planes[0].id, '2026-08-11', 'asistio')
  r = await sync(tel)
  check('sin señal no intenta subir', r.estado, 'sin-conexion')
  check('pero guarda todo localmente', [tel.db.cargos.length, tel.db.eventos.length], [1, 2])
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
  await sync(tel)
  await sync(pc)
  check('al volver la señal sube lo acumulado', pc.db.cargos.length, 1)
  check('y también las asistencias', pc.db.eventos.length, 2)
  if (online) Object.defineProperty(globalThis, 'navigator', online)

  console.log('\n--- 9. Un dispositivo nuevo reconstruye todo ---')
  const nuevo = crearDispositivo('teléfono nuevo')
  await sync(nuevo)
  check('recupera los alumnos', nuevo.db.alumnos.length, 1)
  check('recupera los planes', nuevo.db.planes.length, 1)
  check('recupera las asistencias', nuevo.db.eventos.length, 2)
  check('recupera los cargos', nuevo.db.cargos.length, 1)
  check('recupera los pagos', nuevo.db.pagos.length, 1)
  check('no resucita lo borrado', nuevo.db.cargos[0].concepto, 'Clase particular')

  console.log(fallos === 0 ? '\n✓ Todas las pruebas de sincronización pasaron\n' : `\n✗ ${fallos} pruebas fallaron\n`)
  process.exit(fallos === 0 ? 0 : 1)
}

correr()
