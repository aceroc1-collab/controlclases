import React, { useState } from 'react'
import { Avatar, Vacio, Modal } from '../components/UI.jsx'
import { planActivo, estadoPlan, saldoAlumno, saldoTotalPositivo } from '../lib/motor.js'
import { telefonoValido } from '../lib/mensajes.js'

export default function Alumnos({ db, acc, irAlumno, avisar }) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [form, setForm] = useState(null)

  const lista = db.alumnos
    .filter((a) => a.activo !== false)
    .filter((a) => (filtro === 'todos' ? true : a.disciplina === filtro || a.disciplina === 'ambos'))
    .filter((a) => a.nombre.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <>
      <div className="campo">
        <input placeholder="Buscar alumno" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="chips">
        {[
          ['todos', 'Todos'],
          ['tenis', 'Beach tennis'],
          ['funcional', 'Funcional'],
        ].map(([v, t]) => (
          <button key={v} className={'chip' + (filtro === v ? ' on' : '')} onClick={() => setFiltro(v)}>
            {t}
          </button>
        ))}
      </div>

      <button className="btn pri full" onClick={() => setForm({})}>
        + Nuevo alumno
      </button>

      <div className="seccion">
        {lista.length === 0 ? (
          <Vacio titulo="Todavía no hay alumnos" texto="Agrega el primero y asígnale un plan para empezar a llevar el control." />
        ) : (
          <div className="card">
            {lista.map((a) => {
              const plan = planActivo(db, a.id)
              const est = plan ? estadoPlan(plan, db.eventos, db.suspensiones) : null
              const debe = saldoTotalPositivo(saldoAlumno(db, a.id))
              return (
                <div className="lista-item" key={a.id} onClick={() => irAlumno(a.id)}>
                  <Avatar nombre={a.nombre} disciplina={a.disciplina} />
                  <div className="crece">
                    <div className="nombre">{a.nombre}</div>
                    <div className="sub">
                      {plan
                        ? est.ilimitado
                          ? `Ilimitado · ${est.diasRestantes} días`
                          : `${est.consumidas}/${est.total} clases · ${est.diasRestantes} días`
                        : 'Sin plan activo'}
                    </div>
                  </div>
                  {debe > 0 ? <span className="tag rojo">Debe</span> : null}
                  {est && est.vencido ? <span className="tag rojo">Vencido</span> : null}
                  {est && !est.vencido && est.porAvisar ? <span className="tag oro">Por vencer</span> : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {db.alumnos.some((a) => a.activo === false) && (
        <div className="seccion">
          <div className="eyebrow">Archivados</div>
          <div className="card" style={{ marginTop: 10 }}>
            {db.alumnos
              .filter((a) => a.activo === false)
              .map((a) => (
                <div className="lista-item" key={a.id} onClick={() => irAlumno(a.id)}>
                  <Avatar nombre={a.nombre} disciplina={a.disciplina} />
                  <div className="crece">
                    <div className="nombre">{a.nombre}</div>
                    <div className="sub">Archivado</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {form && <FormAlumno db={db} acc={acc} inicial={form} onCerrar={() => setForm(null)} avisar={avisar} />}
    </>
  )
}

export function FormAlumno({ db, acc, inicial, onCerrar, avisar }) {
  const [nombre, setNombre] = useState(inicial.nombre || '')
  const [telefono, setTelefono] = useState(inicial.telefono || '')
  const [disciplina, setDisciplina] = useState(inicial.disciplina || 'tenis')
  const [notas, setNotas] = useState(inicial.notas || '')
  const [error, setError] = useState('')

  const guardar = () => {
    if (!nombre.trim()) return setError('Escribe el nombre del alumno')
    if (telefono && !telefonoValido(telefono, db.ajustes.codigoPais))
      return setError('El teléfono no parece válido. Usa el número con código de país, por ejemplo +58 412 1234567')
    acc.guardarAlumno({ ...inicial, nombre: nombre.trim(), telefono: telefono.trim(), disciplina, notas })
    avisar(inicial.id ? 'Ficha actualizada' : 'Alumno agregado')
    onCerrar()
  }

  return (
    <Modal titulo={inicial.id ? 'Editar alumno' : 'Nuevo alumno'} onCerrar={onCerrar}>
      <div className="campo">
        <label>Nombre y apellido</label>
        <input
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value)
            setError('')
          }}
          placeholder="María González"
        />
      </div>

      <div className="campo">
        <label>WhatsApp</label>
        <input
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value)
            setError('')
          }}
          placeholder={`+${db.ajustes.codigoPais} 412 1234567`}
          inputMode="tel"
        />
        <div className="ayuda">Con código de país. Es lo que usa el botón de WhatsApp.</div>
      </div>

      <div className="campo">
        <label>Disciplina</label>
        <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
          <option value="tenis">Beach tennis</option>
          <option value="funcional">Funcional</option>
          <option value="ambos">Ambas</option>
        </select>
      </div>

      <div className="campo">
        <label>Notas</label>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Nivel, lesiones, observaciones" />
      </div>

      {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}

      <button className="btn pri full" onClick={guardar}>
        Guardar
      </button>
    </Modal>
  )
}
