import React, { useState } from 'react'
import { entrarConCorreo } from '../lib/supabase.js'

export function Entrar({ onLocal }) {
  const [correo, setCorreo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const enviar = async () => {
    if (!correo.includes('@')) return setError('Escribe un correo válido')
    setCargando(true)
    setError('')
    try {
      await entrarConCorreo(correo.trim())
      setEnviado(true)
    } catch (err) {
      setError(err.message || 'No se pudo enviar el enlace')
    }
    setCargando(false)
  }

  return (
    <div className="app" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div className="cinta" style={{ marginBottom: 22 }} />
      <h1 style={{ fontSize: 30 }}>Control de clases</h1>
      <p className="mini" style={{ marginTop: 8, marginBottom: 26 }}>
        Entra con tu correo para sincronizar entre el teléfono y la computadora.
      </p>

      {enviado ? (
        <div className="card">
          <h3>Revisa tu correo</h3>
          <p className="mini" style={{ marginTop: 8 }}>
            Te enviamos un enlace a <b>{correo}</b>. Ábrelo desde este mismo dispositivo y la sesión queda guardada.
          </p>
          <button className="btn fantasma full chico" style={{ marginTop: 14 }} onClick={() => setEnviado(false)}>
            Usar otro correo
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="campo">
            <label>Correo</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value)
                setError('')
              }}
              placeholder="tu@correo.com"
              inputMode="email"
              autoComplete="email"
            />
            <div className="ayuda">No hay contraseña: recibes un enlace y listo.</div>
          </div>
          {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}
          <button className="btn pri full" onClick={enviar} disabled={cargando}>
            {cargando ? 'Enviando...' : 'Enviarme el enlace'}
          </button>
        </div>
      )}

      <button className="btn fantasma full chico" style={{ marginTop: 18 }} onClick={onLocal}>
        Trabajar sin conectar (solo este dispositivo)
      </button>
      <p className="mini" style={{ marginTop: 10, textAlign: 'center' }}>
        Sin conectar todo funciona igual, pero los datos no salen de aquí y los alumnos no pueden ver su cuenta.
      </p>
    </div>
  )
}

export function EstadoSync({ estado, cuando, onSincronizar }) {
  const texto = {
    ok: cuando ? `Sincronizado ${new Date(cuando).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}` : 'Sincronizado',
    sincronizando: 'Sincronizando...',
    'sin-conexion': 'Sin conexión — se guardará y subirá después',
    'sin-sesion': 'Sin sesión',
    'sin-nube': 'Solo en este dispositivo',
    error: 'No se pudo sincronizar — se reintenta solo',
  }
  const color = {
    error: 'var(--rojo)',
    'sin-conexion': 'var(--ambar)',
  }
  return (
    <button
      className="sync-estado"
      onClick={onSincronizar}
      style={{ color: color[estado] || 'var(--tinta-2)' }}
      title="Tocar para sincronizar ahora"
    >
      <span className={'punto' + (estado === 'sincronizando' ? ' latiendo' : '')} aria-hidden="true" />
      {texto[estado] || estado}
    </button>
  )
}
