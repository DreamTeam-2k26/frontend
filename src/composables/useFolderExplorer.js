import { ref } from 'vue'
import { readLocation, folderError } from '@/components/folders/folderState'

// Uma resposta atrasada nunca substitui o projeto/pasta que já mudou na URL.
export function useFolderExplorer({ getProject, folders }) {
  const project = ref(null)
  const currentFolder = ref(null)
  const items = ref([])
  const loading = ref(true)
  const error = ref('')
  const status = ref(null)
  let version = 0
  let controller
  async function load(params) {
    const current = ++version
    controller?.abort()
    controller = new AbortController()
    const options = { signal: controller.signal }
    loading.value = true
    error.value = ''
    status.value = null
    project.value = null
    currentFolder.value = null
    items.value = []
    try {
      const { projectId, folderId } = readLocation(params)
      const [data, folder] = await Promise.all([
        getProject(projectId, options),
        folderId === null ? null : folders.detail(projectId, folderId, options),
      ])
      const children = await folders.list(projectId, folderId, options)
      if (current !== version) return false
      project.value = data
      currentFolder.value = folder
      items.value = children
      return true
    } catch (cause) {
      if (current !== version) return false
      status.value = cause.response?.status
      error.value = folderError(cause)
      return false
    } finally {
      if (current === version) loading.value = false
    }
  }
  function dispose() {
    version++
    controller?.abort()
  }
  return { project, currentFolder, items, loading, error, status, load, dispose }
}
