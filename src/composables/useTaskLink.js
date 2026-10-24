import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'

// Link direto de uma tarefa (quadro com ?task=id): copiar e abrir em nova aba.
export function useTaskLink() {
  const route = useRoute()
  const router = useRouter()

  function taskUrl(taskId) {
    const { href } = router.resolve({
      name: 'project-kanban',
      params: { id: route.params.id },
      query: { task: String(taskId) },
    })
    return new URL(href, window.location.origin).toString()
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(message)
    } catch {
      toast.error('Não foi possível copiar. Copie pela barra de endereço.')
    }
  }

  const copyLink = (taskId) => copyText(taskUrl(taskId), 'Link copiado.')
  const copyId = (taskId) => copyText(`#${taskId}`, `#${taskId} copiado.`)
  const openInNewTab = (taskId) => window.open(taskUrl(taskId), '_blank', 'noopener')

  return { taskUrl, copyLink, copyId, openInNewTab }
}
