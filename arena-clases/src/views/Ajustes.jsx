import React, { useState, useRef } from 'react'
import { Modal } from '../components/UI.jsx'
import { exportarJSON, importarJSON, dbVacia } from '../lib/db.js'
import { hayNube, salir } from '../lib/supabase.js'
import { subirTodo } from '../lib/sync.js'
import { fmtMonto, VARIABLES_DISPONIBLES } from '../lib/mensajes.js'
import { fmtCorta } from '../lib/fecha.js'

export default function Ajustes({ db, acc, avisar, sesion, sync, onSincronizar, onConectar }) {
  const [modal, setModal] = useState(null)
  const archivo = useRef(null)

  const guardarAjuste = (campo, valor) => acc.guardarAjustes({ [campo]: valor })

  const restaurar = (e) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const lector = new FileReader()
    lector.onload = () => {
      try {
        const nuevo = importarJSON(String(lector.result))
        acc.reemplazarTodo(nuevo)
        avisar('Respaldo restaurado')
      } catch (err) {
        avisar('No se pudo leer el archivo: ' + err.message)
      }
    }
    lector.readAsText(f)
    e.target.value = ''
  }

  return (
    <>
      <div className="seccion" style={{ marginTop: 0 }}>
        <h2>Sincronización</h2>
        {!hayNube ? (
          <div className="aviso-caja" style={{ marginTop: 12 }}>
            La nube no está configurada en este despliegue. La app funciona solo con los datos de este dispositivo.
            Para activarla, agrega las variables <b>VITE_SUPABASE_URL</b> y <b>VITE_SUPABASE_ANON_KEY</b> en Vercel y
            vuelve a desplegar.
          </div>
        ) : sesion ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="fila fila-sep">
              <div className="crece">
                <div style={{ fontWeight: 700 }}>{sesion.user.email}</div>
                <div className="mini">
                  {sync.estado === 'ok' ? 'Al día con la nube' : sync.estado === 'error' ? 'Hubo un problema al sincronizar' : sync.estado === 'sin-conexion' ? 'Sin conexión: se subirá al volver' : 'Sincronizando'}
                </div>
              </div>
              <button className="btn chico" onClick={onSincronizar}>
                Sincronizar
              </button>
            </div>
            <div className="btns">
              <button
                className="btn fantasma chico"
                onClick={async () => {
                  const r = await subirTodo(db)
                  if (r.db) acc.aplicarSincronizacion(r.db)
                  avisar(r.estado === 'ok' ? 'Todo subido de nuevo' : 'No se pudo subir')
                }}
              >
                Volver a subir todo
              </button>
              <button
                className="btn fantasma chico"
                onClick={async () => {
                  await salir()
                  avisar('Sesión cerrada')
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="mini">Estás trabajando solo en este dispositivo.</div>
            <button className="btn pri full" style={{ marginTop: 12 }} onClick={onConectar}>
              Conectar con la nube
            </button>
          </div>
        )}
      </div>

      <div className="seccion">
        <h2>Academia</h2>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="campo">
            <label>Nombre de la marca</label>
            <input value={db.ajustes.marca || ''} onChange={(e) => guardarAjuste('marca', e.target.value)} />
            <div className="ayuda">Aparece en los mensajes de WhatsApp.</div>
          </div>
          <div className="dos">
            <div className="campo">
              <label>Moneda por defecto</label>
              <input
                value={db.ajustes.moneda || 'USD'}
                onChange={(e) => guardarAjuste('moneda', e.target.value.toUpperCase())}
              />
            </div>
            <div className="campo">
              <label>Código de país</label>
              <input
                value={db.ajustes.codigoPais || '58'}
                onChange={(e) => guardarAjuste('codigoPais', e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="campo">
            <label>WhatsApp de contacto</label>
            <input
              value={db.ajustes.telefonoContacto || ''}
              onChange={(e) => guardarAjuste('telefonoContacto', e.target.value)}
              placeholder="+58 412 1234567"
              inputMode="tel"
            />
            <div className="ayuda">Es el número al que te escriben los alumnos desde su enlace privado.</div>
          </div>
          <div className="campo" style={{ marginBottom: 0 }}>
            <label>
              <input
                type="checkbox"
                checked={db.ajustes.compensarLluviaIlimitado !== false}
                onChange={(e) => guardarAjuste('compensarLluviaIlimitado', e.target.checked)}
                style={{ width: 'auto', minHeight: 0, marginRight: 8, verticalAlign: 'middle' }}
              />
              Sumar un día a los planes ilimitados cuando suspendes el día completo
            </label>
          </div>
        </div>
      </div>

      <div className="seccion">
        <div className="seccion-titulo">
          <h2>Planes y precios</h2>
          <button className="btn oro chico" onClick={() => setModal({ t: 'tarifa', tarifa: {} })}>
            + Nuevo
          </button>
        </div>
        <div className="card">
          {db.tarifas.map((t) => (
            <div className="hist" key={t.id}>
              <div className="crece">
                <div style={{ fontWeight: 700 }}>{t.nombre}</div>
                <div className="mini">
                  {t.disciplina === 'tenis' ? 'Beach tennis' : 'Funcional'} ·{' '}
                  {t.modo === 'fija' ? 'agenda fija' : 'horario libre'} ·{' '}
                  {t.limiteSesiones === null ? 'ilimitado' : `${t.limiteSesiones} clases`} · {t.duracionDias || 28} días
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontFamily: 'Archivo, sans-serif' }}>{fmtMonto(t.precio, t.moneda)}</div>
                <button
                  className="btn fantasma chico"
                  style={{ minHeight: 28, fontSize: 11, marginTop: 4 }}
                  onClick={() => setModal({ t: 'tarifa', tarifa: t })}
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="seccion">
        <h2>Mensajes de WhatsApp</h2>
        <div className="card" style={{ marginTop: 12 }}>
          {db.plantillas.map((p) => (
            <div className="hist" key={p.id}>
              <div className="crece">
                <div style={{ fontWeight: 700 }}>{p.nombre}</div>
                <div className="mini" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.texto.split('\n')[0]}
                </div>
              </div>
              <button className="btn fantasma chico" onClick={() => setModal({ t: 'plantilla', plantilla: p })}>
                Editar
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="seccion">
        <h2>Respaldo</h2>
        <div className="aviso-caja" style={{ marginTop: 12 }}>
          {sesion
            ? 'Con la nube conectada tus datos ya están a salvo y sincronizados. Aun así, un respaldo descargado de vez en cuando no sobra.'
            : 'Los datos viven en este dispositivo. Descarga el respaldo cada semana y guárdalo donde no se te pierda: si borras los datos del navegador o cambias de teléfono sin respaldo, se pierde todo.'}
          {db.ajustes.ultimoRespaldo ? ` Último respaldo: ${fmtCorta(db.ajustes.ultimoRespaldo)}.` : ' Todavía no has hecho ninguno.'}
        </div>
        <div className="btns">
          <button
            className="btn pri"
            onClick={() => {
              exportarJSON(db)
              acc.guardarAjustes({ ultimoRespaldo: new Date().toISOString().slice(0, 10) })
              avisar('Respaldo descargado')
            }}
          >
            Descargar respaldo
          </button>
          <button className="btn" onClick={() => archivo.current && archivo.current.click()}>
            Restaurar
          </button>
        </div>
        <input ref={archivo} type="file" accept="application/json,.json" onChange={restaurar} style={{ display: 'none' }} />

        <button
          className="btn fantasma full chico"
          style={{ marginTop: 20, color: 'var(--rojo)', borderColor: 'rgba(165,47,38,.35)' }}
          onClick={() => setModal({ t: 'borrar' })}
        >
          Borrar todos los datos
        </button>
      </div>

      <div className="seccion">
        <div className="cinta" />
        <div className="mini" style={{ marginTop: 12, textAlign: 'center' }}>
          {db.alumnos.length} alumnos · {db.planes.filter((p) => p.estado === 'activo').length} planes activos ·{' '}
          {db.eventos.length} registros
        </div>
      </div>

      {modal && modal.t === 'tarifa' && (
        <FormTarifa db={db} acc={acc} tarifa={modal.tarifa} onCerrar={() => setModal(null)} avisar={avisar} />
      )}
      {modal && modal.t === 'plantilla' && (
        <FormPlantilla acc={acc} plantilla={modal.plantilla} onCerrar={() => setModal(null)} avisar={avisar} />
      )}
      {modal && modal.t === 'borrar' && (
        <Modal titulo="Borrar todos los datos" onCerrar={() => setModal(null)}>
          <p>
            Esto elimina alumnos, planes, asistencias, cargos y pagos de este dispositivo. No se puede deshacer. Descarga
            un respaldo antes si tienes dudas.
          </p>
          <div className="btns">
            <button className="btn" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button
              className="btn"
              style={{ background: 'var(--rojo)', borderColor: 'var(--rojo)', color: '#fff' }}
              onClick={() => {
                acc.reemplazarTodo(dbVacia())
                setModal(null)
                avisar('Datos borrados')
              }}
            >
              Sí, borrar todo
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function FormTarifa({ db, acc, tarifa, onCerrar, avisar }) {
  const [nombre, setNombre] = useState(tarifa.nombre || '')
  const [disciplina, setDisciplina] = useState(tarifa.disciplina || 'tenis')
  const [ilimitado, setIlimitado] = useState(tarifa.limiteSesiones === null)
  const [sesiones, setSesiones] = useState(tarifa.limiteSesiones != null ? String(tarifa.limiteSesiones) : '8')
  const [duracion, setDuracion] = useState(String(tarifa.duracionDias || 28))
  const [precio, setPrecio] = useState(tarifa.precio != null ? String(tarifa.precio) : '')
  const [moneda, setMoneda] = useState(tarifa.moneda || db.ajustes.moneda || 'USD')
  const [error, setError] = useState('')

  // El ilimitado solo existe en funcional: beach tennis siempre lleva agenda fija.
  const puedeIlimitado = disciplina === 'funcional'
  const modo = disciplina === 'tenis' ? 'fija' : 'libre'

  const guardar = () => {
    if (!nombre.trim()) return setError('Ponle nombre al plan')
    const p = Number(precio)
    if (!Number.isFinite(p) || p < 0) return setError('El precio no es válido')
    const lim = puedeIlimitado && ilimitado ? null : Number(sesiones)
    if (lim !== null && (!Number.isFinite(lim) || lim <= 0)) return setError('El número de clases debe ser mayor que cero')
    acc.guardarTarifa({
      ...tarifa,
      nombre: nombre.trim(),
      disciplina,
      modo,
      limiteSesiones: lim,
      duracionDias: Number(duracion) || 28,
      precio: p,
      moneda,
    })
    avisar('Plan guardado')
    onCerrar()
  }

  return (
    <Modal titulo={tarifa.id ? 'Editar plan' : 'Nuevo plan'} onCerrar={onCerrar}>
      <div className="campo">
        <label>Nombre</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Beach tennis 2x semana" />
      </div>

      <div className="campo">
        <label>Disciplina</label>
        <select
          value={disciplina}
          onChange={(e) => {
            setDisciplina(e.target.value)
            if (e.target.value === 'tenis') setIlimitado(false)
          }}
        >
          <option value="tenis">Beach tennis (agenda fija)</option>
          <option value="funcional">Funcional (horario libre)</option>
        </select>
        <div className="ayuda">
          {modo === 'fija'
            ? 'Se le asignan días y horario al alumno. La clase se descuenta venga o no.'
            : 'El alumno viene cuando puede. Solo descuenta al marcar asistencia.'}
        </div>
      </div>

      {puedeIlimitado && (
        <div className="campo">
          <label>
            <input
              type="checkbox"
              checked={ilimitado}
              onChange={(e) => setIlimitado(e.target.checked)}
              style={{ width: 'auto', minHeight: 0, marginRight: 8, verticalAlign: 'middle' }}
            />
            Mensual ilimitado (sin contar sesiones)
          </label>
        </div>
      )}

      {!(puedeIlimitado && ilimitado) && (
        <div className="campo">
          <label>Número de clases</label>
          <input type="number" value={sesiones} onChange={(e) => setSesiones(e.target.value)} inputMode="numeric" />
        </div>
      )}

      <div className="dos">
        <div className="campo">
          <label>Duración (días)</label>
          <input type="number" value={duracion} onChange={(e) => setDuracion(e.target.value)} inputMode="numeric" />
        </div>
        <div className="campo">
          <label>Precio</label>
          <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" />
        </div>
      </div>

      <div className="campo">
        <label>Moneda</label>
        <input value={moneda} onChange={(e) => setMoneda(e.target.value.toUpperCase())} />
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <button className="btn pri full" onClick={guardar}>
        Guardar
      </button>
      {tarifa.id ? (
        <button
          className="btn fantasma full chico"
          style={{ marginTop: 10 }}
          onClick={() => {
            acc.borrarTarifa(tarifa.id)
            avisar('Plan eliminado')
            onCerrar()
          }}
        >
          Eliminar plan
        </button>
      ) : null}
    </Modal>
  )
}

function FormPlantilla({ acc, plantilla, onCerrar, avisar }) {
  const [texto, setTexto] = useState(plantilla.texto)
  return (
    <Modal titulo={plantilla.nombre} onCerrar={onCerrar}>
      <div className="campo">
        <label>Texto del mensaje</label>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} style={{ minHeight: 190 }} />
      </div>
      <div className="campo">
        <label>Variables disponibles</label>
        <div className="chips">
          {VARIABLES_DISPONIBLES.map((v) => (
            <button key={v} className="chip" onClick={() => setTexto((t) => t + ' ' + v)} type="button">
              {v}
            </button>
          ))}
        </div>
      </div>
      <button
        className="btn pri full"
        onClick={() => {
          acc.guardarPlantilla({ ...plantilla, texto })
          avisar('Mensaje guardado')
          onCerrar()
        }}
      >
        Guardar
      </button>
    </Modal>
  )
}
