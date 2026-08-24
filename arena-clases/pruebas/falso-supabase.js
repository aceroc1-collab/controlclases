// Imita lo justo del SDK de Supabase para poder probar la sincronización
// entre dos dispositivos sin tocar la red.

export const servidor = { filas: [], reloj: 0, respuestaRPC: null }

export function limpiarServidor() {
  servidor.filas = []
  servidor.reloj = 0
}

function ahoraServidor() {
  servidor.reloj++
  return new Date(Date.UTC(2026, 0, 1, 0, 0, servidor.reloj)).toISOString()
}

function consulta() {
  const filtros = []
  const api = {
    select() {
      return api
    },
    gt(campo, valor) {
      filtros.push((f) => f[campo] > valor)
      return api
    },
    order() {
      return api
    },
    limit() {
      return api
    },
    then(resolver) {
      const data = servidor.filas
        .filter((f) => filtros.every((fn) => fn(f)))
        .sort((a, b) => a.synced_at.localeCompare(b.synced_at))
      return Promise.resolve({ data, error: null }).then(resolver)
    },
  }
  return api
}

export function createClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'coach-1', email: 'coach@test.com' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOtp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    },
    from() {
      return {
        ...consulta(),
        upsert(lote) {
          lote.forEach((fila) => {
            const i = servidor.filas.findIndex(
              (f) => f.coach_id === fila.coach_id && f.coleccion === fila.coleccion && f.id === fila.id
            )
            const guardada = { ...fila, synced_at: ahoraServidor() }
            if (i >= 0) servidor.filas[i] = guardada
            else servidor.filas.push(guardada)
          })
          return Promise.resolve({ error: null })
        },
      }
    },
    rpc: async () => ({ data: servidor.respuestaRPC, error: null }),
  }
}
