// Reduz fotos antes do envio. O proxy do servidor recusa corpos grandes (413, sem CORS) e uma foto
// da câmera do celular passa fácil de alguns MB; redesenhada em JPEG ~1600 px fica bem menor.

export const MAX_SIDE = 1600
const QUALITY = 0.8
const MIN_BYTES = 500 * 1024
// GIF fica de fora: o canvas perderia a animação.
const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp']

export function shouldCompress(file) {
  return COMPRESSIBLE.includes(file.type) && file.size > MIN_BYTES
}

/** Novo tamanho com o lado maior em `max`, sem ampliar imagem pequena. */
export function fitWithin(width, height, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height))

  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export function jpegName(name) {
  const base = String(name ?? '').replace(/\.[^.]+$/, '')

  return `${base || 'foto'}.jpg`
}

/**
 * Devolve a foto reduzida em JPEG, ou o próprio arquivo quando não vale a pena
 * (não é foto, já é pequena, o navegador não decodifica o formato ou o resultado ficou maior).
 */
export async function compressImage(file) {
  if (!shouldCompress(file)) return file

  try {
    // createImageBitmap já aplica a rotação EXIF da câmera.
    const bitmap = await createImageBitmap(file)
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')

    // JPEG não tem transparência: fundo branco no lugar do preto (PNG com áreas transparentes).
    context.fillStyle = 'white'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))

    if (!blob || blob.size >= file.size) return file

    return new File([blob], jpegName(file.name), { type: 'image/jpeg' })
  } catch {
    return file
  }
}
