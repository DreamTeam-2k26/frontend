const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// Coordenadas na imagem original; a mesma área alimenta prévia e arquivo exportado.
export function cropArea(width, height, { zoom = 1, x = width / 2, y = height / 2 } = {}) {
  const scale = clamp(Number(zoom) || 1, 1, 4)
  const size = Math.min(width, height) / scale
  const centerX = clamp(x, size / 2, width - size / 2)
  const centerY = clamp(y, size / 2, height - size / 2)
  return { x: centerX - size / 2, y: centerY - size / 2, size, centerX, centerY, zoom: scale }
}

export function moveCrop(width, height, crop, deltaX, deltaY, viewportWidth) {
  const area = cropArea(width, height, crop)
  return cropArea(width, height, {
    zoom: area.zoom,
    x: area.centerX - (deltaX * area.size) / viewportWidth,
    y: area.centerY - (deltaY * area.size) / viewportWidth,
  })
}
