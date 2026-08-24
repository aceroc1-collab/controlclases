import React, { useEffect, useRef, useState } from 'react'
import { Modal } from './UI.jsx'
import { datosInforme, textoInforme, dibujarInforme, informeABlob, nombreArchivo } from '../lib/informe.js'
import { enlaceWhatsApp, telefonoValido } from '../lib/mensajes.js'
import { hoyISO } from '../lib/fecha.js'

export default function Informe({ db, acc, alumno, onCerrar, avisar }) {
  const lienzo = useRef(null)
  const [listo, setListo] = useState(false)
  const [trabajando, setTrabajando] = useState(false)
  const datos = datosInforme(db, alumno)
  const texto = textoInforme(datos)
  const puedeWA = telefonoValido(alumno.telefono, db.ajustes.codigoPais)
  const puedeCompartir = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'

  useEffect(() => {
    let vivo = true
    const pintar = () => {
      if (!vivo || !lienzo.current) return
      try {
        dibujarInforme(lienzo.current, datos)
        setListo(true)
      } catch (err) {
        console.error('No se pudo dibujar el informe', err)
      }
    }
    // Se espera a las tipografías: si no, la primera vez sale con la fuente
    // de reserva y el informe queda distinto al de la app.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(pintar)
    else pintar()
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumno.id])

  const archivo = async () => {
    const blob = await informeABlob(lienzo.current)
    return new File([blob], nombreArchivo(alumno, hoyISO()), { type: 'image/png' })
  }

  const compartirImagen = async () => {
    setTrabajando(true)
    try {
      const f = await archivo()
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f], title: `Estado de cuenta · ${alumno.nombre}` })
        acc.registrarEnvio(alumno.id, 'Informe (imagen)')
      } else {
        descargar(await informeABlob(lienzo.current))
        avisar('Imagen guardada — adjúntala en WhatsApp')
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') avisar('No se pudo compartir la imagen')
    }
    setTrabajando(false)
  }

  const descargar = (blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo(alumno, hoyISO())
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const guardar = async () => {
    setTrabajando(true)
    try {
      descargar(await informeABlob(lienzo.current))
      avisar('Imagen guardada')
    } catch {
      avisar('No se pudo guardar la imagen')
    }
    setTrabajando(false)
  }

  return (
    <Modal titulo="Informe del alumno" onCerrar={onCerrar}>
      <div className="informe-previa">
        <canvas ref={lienzo} />
      </div>

      <button
        className="btn wa full"
        disabled={!puedeWA}
        onClick={() => {
          window.open(enlaceWhatsApp(alumno.telefono, texto, db.ajustes.codigoPais), '_blank', 'noopener')
          acc.registrarEnvio(alumno.id, 'Informe (texto)')
          avisar('Informe enviado')
          onCerrar()
        }}
      >
        Enviar por WhatsApp
      </button>
      <p className="mini" style={{ marginTop: 6 }}>
        {puedeWA
          ? 'Va como mensaje de texto, con la misma información. Llega siempre, sin adjuntos.'
          : 'Agrega el teléfono del alumno en su ficha para poder enviarlo.'}
      </p>

      <div className="btns">
        {puedeCompartir ? (
          <button className="btn pri" onClick={compartirImagen} disabled={!listo || trabajando}>
            Compartir imagen
          </button>
        ) : null}
        <button className="btn" onClick={guardar} disabled={!listo || trabajando}>
          Guardar imagen
        </button>
      </div>
      <p className="mini" style={{ marginTop: 6 }}>
        La imagen se ve mejor en el chat, pero hay que adjuntarla a mano si tu teléfono no ofrece compartir directo.
      </p>

      <details style={{ marginTop: 18 }}>
        <summary className="mini" style={{ cursor: 'pointer' }}>
          Ver el texto que se va a enviar
        </summary>
        <pre className="informe-texto">{texto}</pre>
      </details>
    </Modal>
  )
}
