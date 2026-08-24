import { dbVacia, uid } from '../src/lib/db.js'
import { hoyISO, sumarDias } from '../src/lib/fecha.js'
import { datosInforme, textoInforme, dibujarInforme, nombreArchivo } from '../src/lib/informe.js'

let fallos = 0
function check(nombre, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado)
  if (!ok) fallos++
  console.log(`${ok ? '  OK ' : ' FALLA'} ${nombre}${ok ? '' : `\n         esperado: ${JSON.stringify(esperado)}\n         obtenido: ${JSON.stringify(real)}`}`)
}
function checkQue(nombre, condicion, detalle) {
  if (!condicion) fallos++
  console.log(`${condicion ? '  OK ' : ' FALLA'} ${nombre}${condicion ? '' : `\n         ${detalle || ''}`}`)
}

// Lienzo simulado: registra lo que se dibuja para poder revisarlo.
function lienzoFalso() {
  const textos = []
  const ctx = {
    _font: '400 16px sans',
    set font(v) {
      this._font = v
    },
    get font() {
      return this._font
    },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    letterSpacing: '0px',
    globalCompositeOperation: 'source-over',
    fillText(t, x, y) {
      const tam = Number((this._font.match(/(\d+)px/) || [0, 16])[1])
      textos.push({ t: String(t), x, y, ancho: String(t).length * tam * 0.52 })
    },
    fillRect() {},
    measureText(t) {
      const tam = Number((this._font.match(/(\d+)px/) || [0, 16])[1])
      return { width: String(t).length * tam * 0.52 }
    },
    beginPath() {},
    moveTo() {},
    arcTo() {},
    closePath() {},
    fill() {},
    stroke() {},
  }
  return { canvas: { width: 0, height: 0, getContext: () => ctx }, textos }
}

// ---- datos de prueba ----
const db = dbVacia()
const hoy = hoyISO()
const dow = new Date().getDay()
const maria = { id: uid(), nombre: 'María González', telefono: '+584121234567', disciplina: 'tenis', activo: true }
const ana = { id: uid(), nombre: 'Ana Ruiz', telefono: '04141112233', disciplina: 'funcional', activo: true }
const luis = { id: uid(), nombre: 'Luis Fernández de la Torre', telefono: '', disciplina: 'tenis', activo: true }
db.alumnos = [maria, ana, luis]
db.ajustes.marca = 'Playa Seca'
db.ajustes.telefonoContacto = '+58 412 1234567'

db.planes = [
  { id: 'p1', alumnoId: maria.id, nombreTarifa: 'Beach tennis 2x semana', disciplina: 'tenis', modo: 'fija',
    limiteSesiones: 8, duracionDias: 28, fechaInicio: sumarDias(hoy, -12), dias: [dow, (dow + 2) % 7], hora: '18:00',
    precio: 40, moneda: 'USD', estado: 'activo', ajusteSesiones: 0, ajusteDias: 0 },
  { id: 'p2', alumnoId: ana.id, nombreTarifa: 'Funcional mensual ilimitado', disciplina: 'funcional', modo: 'libre',
    limiteSesiones: null, duracionDias: 28, fechaInicio: sumarDias(hoy, -20), dias: [], hora: '',
    precio: 50, moneda: 'USD', estado: 'activo', ajusteSesiones: 0, ajusteDias: 0 },
]
db.eventos = [
  { id: 'e1', planId: 'p1', fecha: sumarDias(hoy, -10), tipo: 'falto' },
  { id: 'e2', planId: 'p1', fecha: sumarDias(hoy, -5), tipo: 'asistio' },
  { id: 'e3', planId: 'p2', fecha: sumarDias(hoy, -3), tipo: 'asistio' },
]
db.cargos = [
  { id: 'c1', alumnoId: maria.id, concepto: 'Beach tennis 2x semana', monto: 40, moneda: 'USD', fecha: sumarDias(hoy, -12) },
  { id: 'c2', alumnoId: maria.id, concepto: 'Clase particular', monto: 25, moneda: 'USD', fecha: sumarDias(hoy, -2) },
]
db.pagos = [{ id: 'g1', alumnoId: maria.id, monto: 40, moneda: 'USD', metodo: 'Zelle', fecha: sumarDias(hoy, -12) }]

console.log('\n--- 1. El informe reúne lo que debe ---')
const dMaria = datosInforme(db, maria)
check('trae el plan activo', dMaria.activos.length, 1)
check('trae las asistencias', dMaria.eventos.length, 2)
check('calcula la deuda', dMaria.debe, [['USD', 25]])
check('lleva la marca', dMaria.marca, 'Playa Seca')

console.log('\n--- 2. El texto para WhatsApp ---')
const txt = textoInforme(dMaria)
checkQue('encabeza con la marca', txt.startsWith('*Playa Seca — Estado de cuenta*'), txt.slice(0, 60))
checkQue('nombra al alumno', txt.includes('María González'))
checkQue('dice cuántas clases lleva', /Clases: \d+ de 8 usadas/.test(txt), txt)
checkQue('muestra el pendiente', txt.includes('Pendiente por pagar: USD 25,00'), txt)
checkQue('lista los movimientos', txt.includes('Últimos movimientos') && txt.includes('Clase particular'))
checkQue('muestra también los pagos', txt.includes('− Pago'), txt)
checkQue('no filtra el teléfono del alumno', !txt.includes('584121234567'))
checkQue('cabe en un mensaje de WhatsApp', txt.length < 4096, `mide ${txt.length}`)

console.log('\n--- 3. Alumno al día e ilimitado ---')
const dAna = datosInforme(db, ana)
const txtAna = textoInforme(dAna)
checkQue('avisa que está al día', txtAna.includes('Estás al día'), txtAna)
checkQue('habla de días y no de clases', txtAna.includes('Mensual ilimitado'), txtAna)

console.log('\n--- 4. Alumno sin plan ---')
const dLuis = datosInforme(db, luis)
check('no inventa planes', dLuis.activos.length, 0)
checkQue('lo dice claramente', textoInforme(dLuis).includes('Sin plan activo'))

console.log('\n--- 5. El dibujo no falla y mide bien ---')
;[
  ['con deuda y plan de agenda fija', dMaria],
  ['ilimitado al día', dAna],
  ['sin plan', dLuis],
].forEach(([nombre, datos]) => {
  const { canvas, textos } = lienzoFalso()
  let alto = 0
  try {
    alto = dibujarInforme(canvas, datos)
  } catch (err) {
    fallos++
    console.log(` FALLA dibuja ${nombre}: ${err.message}`)
    return
  }
  checkQue(`dibuja ${nombre}`, alto > 400 && alto < 4000, `alto ${alto}`)
  checkQue(`el lienzo queda del alto calculado (${nombre})`, canvas.height === alto)

  const desbordes = textos.filter((t) => t.x + t.ancho > 1080 - 40)
  checkQue(
    `nada se sale del ancho (${nombre})`,
    desbordes.length === 0,
    desbordes.map((d) => `"${d.t}" llega a ${Math.round(d.x + d.ancho)}`).join(' | ')
  )

  const ultimo = Math.max(...textos.map((t) => t.y))
  checkQue(`nada queda por debajo del lienzo (${nombre})`, ultimo <= alto, `último texto en y=${ultimo}, alto ${alto}`)
})

console.log('\n--- 6. Nombres y planes largos ---')
const largo = { id: uid(), nombre: 'María Fernanda Villalobos de Rodríguez', telefono: '', disciplina: 'tenis', activo: true }
db.alumnos.push(largo)
db.planes.push({
  id: 'p3', alumnoId: largo.id, nombreTarifa: 'Beach tennis 4x semana con preparación física incluida',
  disciplina: 'tenis', modo: 'fija', limiteSesiones: 16, duracionDias: 28, fechaInicio: sumarDias(hoy, -6),
  dias: [1, 2, 4, 5], hora: '18:00', precio: 70, moneda: 'USD', estado: 'activo', ajusteSesiones: 0, ajusteDias: 0,
})
db.ajustes.marca = 'Playa Seca Academia de Arena'
{
  const { canvas, textos } = lienzoFalso()
  const alto = dibujarInforme(canvas, datosInforme(db, largo))
  const desbordes = textos.filter((t) => t.x + t.ancho > 1080 - 40)
  checkQue(
    'los nombres largos no se salen',
    desbordes.length === 0,
    desbordes.map((d) => `"${d.t}" llega a ${Math.round(d.x + d.ancho)}`).join(' | ')
  )
  checkQue('el informe sigue siendo razonable de alto', alto > 400 && alto < 4000, `alto ${alto}`)
}
db.ajustes.marca = 'Playa Seca'

console.log('\n--- 7. Nombre del archivo ---')
check('limpia acentos y espacios', nombreArchivo(maria, '2026-08-15'), 'estado-de-cuenta-maria-gonzalez-2026-08-15.png')

console.log(fallos === 0 ? '\n✓ Todas las pruebas del informe pasaron\n' : `\n✗ ${fallos} pruebas fallaron\n`)
process.exit(fallos === 0 ? 0 : 1)
