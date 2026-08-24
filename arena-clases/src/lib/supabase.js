import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const CLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si no hay variables de entorno la app funciona igual, solo que sin nube.
export const hayNube = Boolean(URL && CLAVE)

export const supabase = hayNube
  ? createClient(URL, CLAVE, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export async function sesionActual() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session || null
}

export async function entrarConCorreo(correo) {
  if (!supabase) throw new Error('La nube no está configurada')
  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function salir() {
  if (!supabase) return
  await supabase.auth.signOut()
}
