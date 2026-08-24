import React, { useState, useMemo } from 'react'
import { Modal } from './UI.jsx'
import { armarMensaje, enlaceWhatsApp, telefonoValido } from '../lib/mensajes.js'

export default function EnviarWA({ db, acc, alumno, plan, estado, onCerrar, avisar }) {
  const [plantillaId, setPlantillaId] = useState(sugerir(estado))
  const plantilla = db.plantillas.find((p) => p.id === plantillaId) || db.plantillas[0]
  const [texto, setTexto] = useState('')
  const [tocado, setTocado] = useState(false)

  const generado = useMemo(
    () => armarMensaje(plantilla ? plantilla.texto : '', { db, alumno, plan, estado }),
    [plantilla, db, alumno, plan, estado]
  )
  const final = tocado ? texto : generado
  const valido = telefonoValido(alumno.telefono, db.ajustes.codigoPais)

  return (
    <Modal titulo={`Avisar a ${(alumno.nombre || '').split(' ')[0]}`} onCerrar={onCerrar}>
      <div className="campo">
        <label>Plantilla</label>
        <select
          value={plantilla ? plantilla.id : ''}
          onChange={(e) => {
            setPlantillaId(e.target.value)
            setTocado(false)
          }}
        >
          {db.plantillas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label>Mensaje</label>
        <textarea
          value={final}
          onChange={(e) => {
            setTocado(true)
            setTexto(e.target.value)
          }}
          style={{ minHeight: 170 }}
        />
        <div className="ayuda">Puedes editarlo antes de enviar. WhatsApp se abre con el texto ya escrito.</div>
      </div>

      {!valido && (
        <div className="campo">
          <div className="error">
            El teléfono de este alumno no es válido. Agrégalo con código de país en su ficha.
          </div>
        </div>
      )}

      <button
        className="btn wa full"
        disabled={!valido}
        onClick={() => {
          const url = enlaceWhatsApp(alumno.telefono, final, db.ajustes.codigoPais)
          acc.registrarEnvio(alumno.id, plantilla ? plantilla.nombre : 'mensaje')
          window.open(url, '_blank', 'noopener')
          avisar('Aviso registrado')
          onCerrar()
        }}
      >
        Abrir WhatsApp
      </button>
    </Modal>
  )
}

function sugerir(estado) {
  if (!estado) return 'cobro-suelto'
  if (estado.vencido) return 'plan-vencido'
  if (estado.ilimitado) return 'sin-venir'
  return 'plan-por-vencer'
}
