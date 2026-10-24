import { ref, shallowRef } from 'vue'
import { apiErrorMessage } from '@/utils/apiErrors'

// Links gerais (task null) de um projeto. Trocar de projeto descarta respostas do anterior.
// client: { list(projectId, { signal }), create(data), update(id, fields), remove(id) }
export function useProjectLinks(client) {
  const items = ref([])
  const loading = shallowRef(true)
  const error = shallowRef('')
  let projectId = null
  let generation = 0
  let controller

  async function load(project) {
    const current = ++generation
    controller?.abort()
    controller = new AbortController()
    projectId = project
    items.value = []
    loading.value = true
    error.value = ''
    try {
      const data = await client.list(project, { signal: controller.signal })
      if (current === generation) items.value = data
    } catch (cause) {
      if (current === generation && !controller.signal.aborted)
        error.value = apiErrorMessage(cause, 'Não foi possível carregar os links de apoio.')
    } finally {
      if (current === generation) loading.value = false
    }
  }

  // Erros sobem para quem chamou (formulário mostra 400 por campo; ação mostra o resto).
  // Com task, o link nasce na tarefa e não entra na lista geral.
  async function create({ title, url, task = null }) {
    const current = generation
    const { data } = await client.create({ project: projectId, task, title, url })
    if (current === generation && data.task == null) items.value = [data, ...items.value]
    return data
  }

  const drop = (link) => (items.value = items.value.filter((other) => other.id !== link.id))

  async function update(link, fields) {
    const current = generation
    try {
      const { data } = await client.update(link.id, fields)
      if (current !== generation) return data
      // Vinculado a uma tarefa: deixa de ser geral. A resposta não traz o nome do autor.
      if (data.task != null) drop(link)
      else
        items.value = items.value.map((other) =>
          other.id === link.id
            ? { ...other, ...data, created_by_name: other.created_by_name }
            : other,
        )
      return data
    } catch (cause) {
      if (current === generation && cause.response?.status === 404) drop(link)
      throw cause
    }
  }

  async function remove(link) {
    const current = generation
    try {
      await client.remove(link.id)
    } catch (cause) {
      // Já excluído por outra pessoa: some da lista, mas avisa.
      if (current === generation && cause.response?.status === 404) drop(link)
      throw cause
    }
    if (current === generation) drop(link)
  }

  function dispose() {
    generation++
    controller?.abort()
  }

  return { items, loading, error, load, create, update, remove, dispose }
}
