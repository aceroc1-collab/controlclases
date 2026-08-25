#!/bin/bash
# Ejecuta las tres baterías de pruebas: motor, sincronización y pantallas.
set -e
cd "$(dirname "$0")/.."

cat > /tmp/globals-prueba.js << 'GLOBALS'
const store = {}
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: (k) => { delete store[k] },
}
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true, clipboard: { writeText: async () => {} } }, configurable: true })
globalThis.window = { addEventListener() {}, removeEventListener() {}, scrollTo() {}, open() {}, location: { origin: 'https://clases.app', pathname: '/' } }
globalThis.document = { body: { style: {} }, createElement: () => ({ click() {} }), getElementById: () => null }
GLOBALS

FAKE="--alias:@supabase/supabase-js=./pruebas/falso-supabase.js"
ENV="--define:import.meta.env.VITE_SUPABASE_URL=\"https://falso.supabase.co\" --define:import.meta.env.VITE_SUPABASE_ANON_KEY=\"clave-falsa\""

echo "=== Motor de planes ==="
node pruebas/motor.mjs

echo "=== Informe ==="
node pruebas/informe.mjs

echo "=== Sincronización ==="
npx esbuild pruebas/sincronizacion.mjs --bundle --platform=node --format=cjs --outfile=/tmp/p-sync.cjs \
  $FAKE --define:import.meta.env.VITE_SUPABASE_URL='"https://falso.supabase.co"' \
  --define:import.meta.env.VITE_SUPABASE_KEY='"clave-falsa"' \
  --define:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY='""' \
  --define:import.meta.env.VITE_SUPABASE_ANON_KEY='""' >/dev/null
node /tmp/p-sync.cjs

echo "=== Pantallas ==="
npx esbuild pruebas/pantallas.mjs --bundle --platform=node --format=cjs --outfile=/tmp/p-pant.cjs \
  $FAKE --inject:/tmp/globals-prueba.js --define:import.meta.env.VITE_SUPABASE_URL='"https://falso.supabase.co"' \
  --define:import.meta.env.VITE_SUPABASE_KEY='"clave-falsa"' \
  --define:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY='""' \
  --define:import.meta.env.VITE_SUPABASE_ANON_KEY='""' >/dev/null
node /tmp/p-pant.cjs
