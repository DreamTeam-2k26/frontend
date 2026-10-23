import { onBeforeUnmount, ref } from 'vue'
import { downloadFile } from '../services/chatApi'

// Anexos exigem o JWT, então são baixados via axios como Blob e exibidos por URL local (blob:).
// O cache evita baixar a mesma imagem a cada render; as URLs são revogadas ao sair do chat.
const cache = new Map() // id da mensagem -> Promise<Blob>

export function clearAttachmentCache() {
  cache.clear()
}

function fetchBlob(messageId) {
  if (!cache.has(messageId)) {
    const promise = downloadFile(messageId).catch((error) => {
      cache.delete(messageId)

      throw error
    })

    cache.set(messageId, promise)
  }

  return cache.get(messageId)
}

/** Carrega o anexo como URL local para <img>. */
export function useAttachmentPreview(messageId) {
  const url = ref(null)
  const failed = ref(false)

  fetchBlob(messageId)
    .then((blob) => {
      url.value = URL.createObjectURL(blob)
    })
    .catch(() => {
      failed.value = true
    })

  onBeforeUnmount(() => {
    if (url.value) URL.revokeObjectURL(url.value)
  })

  return { url, failed }
}

/** Salva o anexo no computador com o nome original. */
export async function saveAttachment(messageId, fileName) {
  const blob = await fetchBlob(messageId)
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = href
  link.download = fileName || 'arquivo'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(href), 10_000)
}
