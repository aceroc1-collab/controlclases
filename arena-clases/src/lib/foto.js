// Reduce cualquier foto a un cuadrado pequeño antes de guardarla: así una
// foto de cámara de varios MB no infla el respaldo local ni la fila de Supabase.
export function redimensionarFoto(file, tam = 160) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'))
      img.onload = () => {
        const lado = Math.min(img.width, img.height)
        const sx = (img.width - lado) / 2
        const sy = (img.height - lado) / 2
        const lienzo = document.createElement('canvas')
        lienzo.width = tam
        lienzo.height = tam
        const ctx = lienzo.getContext('2d')
        ctx.drawImage(img, sx, sy, lado, lado, 0, 0, tam, tam)
        resolve(lienzo.toDataURL('image/jpeg', 0.82))
      }
      img.src = String(lector.result)
    }
    lector.readAsDataURL(file)
  })
}
