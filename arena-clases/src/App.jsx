import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { cargarDB, guardarDB, pedirAlmacenamientoPersistente } from './lib/db.js'
import { crearAcciones } from './lib/acciones.js'
import { panelCobranza } from './lib/motor.js'
import { hayNube, sesionActual, supabase } from './lib/supabase.js'
import { sincronizar } from './lib/sync.js'
import { Entrar, EstadoSync } from './components/Sesion.jsx'
import Hoy from './views/Hoy.jsx'
import Alumnos from './views/Alumnos.jsx'
import AlumnoDetalle from './views/AlumnoDetalle.jsx'
import Cobranza from './views/Cobranza.jsx'
import Ingresos from './views/Ingresos.jsx'
import AjustesView from './views/Ajustes.jsx'

const TABS = [
  { id: 'hoy', ico: '☀', txt: 'Hoy' },
  { id: 'alumnos', ico: '⚉', txt: 'Alumnos' },
  { id: 'cobranza', ico: '◎', txt: 'Cobranza' },
  { id: 'ingresos', ico: '▤', txt: 'Ingresos' },
  { id: 'ajustes', ico: '⚙', txt: 'Ajustes' },
]

const TITULOS = {
  hoy: 'Clases de hoy',
  alumnos: 'Alumnos',
  cobranza: 'Cobranza',
  ingresos: 'Ingresos',
  ajustes: 'Ajustes',
}

const CLAVE_LOCAL = 'arena-clases-modo-local'

export default function App() {
  const [db, setDB] = useState(cargarDB)
  const [tab, setTab] = useState('hoy')
  const [alumnoId, setAlumnoId] = useState(null)
  const [toast, setToast] = useState(null)
  const [sesion, setSesion] = useState(undefined) // undefined = todavía comprobando
  const [modoLocal, setModoLocal] = useState(() => localStorage.getItem(CLAVE_LOCAL) === 'si')
  const [sync, setSync] = useState({ estado: hayNube ? 'sin-sesion' : 'sin-nube', cuando: null })

  const sincronizando = useRef(false)
  const dbRef = useRef(db)
  dbRef.current = db

  useEffect(() => {
    guardarDB(db)
  }, [db])

  useEffect(() => {
    pedirAlmacenamientoPersistente()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const acc = useMemo(() => crearAcciones(setDB), [])
  const avisar = useCallback((m) => setToast(m), [])

  // ---- sesión ----
  useEffect(() => {
    if (!hayNube) {
      setSesion(null)
      return
    }
    sesionActual().then(setSesion)
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s || null))
    return () => data.subscription.unsubscribe()
  }, [])

  // ---- sincronización ----
  const correrSync = useCallback(async () => {
    if (sincronizando.current) return
    if (!hayNube || !sesion) return
    sincronizando.current = true
    setSync((s) => ({ ...s, estado: 'sincronizando' }))
    const r = await sincronizar(dbRef.current)
    if (r.db) setDB(r.db)
    setSync({ estado: r.estado, cuando: r.cuando || null })
    sincronizando.current = false
  }, [sesion])

  useEffect(() => {
    if (sesion) correrSync()
  }, [sesion, correrSync])

  // Cada cambio dispara una subida, con un respiro para no ir por cada toque.
  useEffect(() => {
    if (!hayNube || !sesion) return
    const t = setTimeout(correrSync, 2500)
    return () => clearTimeout(t)
  }, [db, sesion, correrSync])

  useEffect(() => {
    const volver = () => correrSync()
    window.addEventListener('online', volver)
    return () => window.removeEventListener('online', volver)
  }, [correrSync])

  const pendientes = useMemo(() => {
    const { vencidos, porVencer } = panelCobranza(db)
    return vencidos.length + porVencer.length
  }, [db])

  const irAlumno = useCallback((id) => {
    setAlumnoId(id)
    setTab('alumnos')
    window.scrollTo(0, 0)
  }, [])

  const cambiarTab = (id) => {
    setAlumnoId(null)
    setTab(id)
    window.scrollTo(0, 0)
  }

  if (hayNube && sesion === undefined) {
    return <div className="app" style={{ padding: 40, textAlign: 'center', color: 'var(--tinta-2)' }}>Cargando...</div>
  }

  if (hayNube && !sesion && !modoLocal) {
    return (
      <Entrar
        onLocal={() => {
          localStorage.setItem(CLAVE_LOCAL, 'si')
          setModoLocal(true)
        }}
      />
    )
  }

  let contenido
  if (tab === 'alumnos' && alumnoId) {
    contenido = (
      <AlumnoDetalle db={db} acc={acc} alumnoId={alumnoId} volver={() => setAlumnoId(null)} avisar={avisar} />
    )
  } else if (tab === 'hoy') {
    contenido = <Hoy db={db} acc={acc} irAlumno={irAlumno} avisar={avisar} />
  } else if (tab === 'alumnos') {
    contenido = <Alumnos db={db} acc={acc} irAlumno={irAlumno} avisar={avisar} />
  } else if (tab === 'cobranza') {
    contenido = <Cobranza db={db} acc={acc} irAlumno={irAlumno} avisar={avisar} />
  } else if (tab === 'ingresos') {
    contenido = <Ingresos db={db} irAlumno={irAlumno} />
  } else {
    contenido = (
      <AjustesView
        db={db}
        acc={acc}
        avisar={avisar}
        sesion={sesion}
        sync={sync}
        onSincronizar={correrSync}
        onConectar={() => {
          localStorage.removeItem(CLAVE_LOCAL)
          setModoLocal(false)
        }}
      />
    )
  }

  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-fila">
          <h1>{alumnoId && tab === 'alumnos' ? 'Ficha' : TITULOS[tab]}</h1>
          <div style={{ textAlign: 'right' }}>
            <div className="eyebrow">{db.ajustes.marca}</div>
            <EstadoSync estado={sync.estado} cuando={sync.cuando} onSincronizar={correrSync} />
          </div>
        </div>
      </header>

      <main>{contenido}</main>

      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => cambiarTab(t.id)}>
            <span className="ico" aria-hidden="true">
              {t.ico}
            </span>
            {t.txt}
            {t.id === 'cobranza' && pendientes > 0 ? <span className="pip">{pendientes}</span> : null}
          </button>
        ))}
      </nav>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
