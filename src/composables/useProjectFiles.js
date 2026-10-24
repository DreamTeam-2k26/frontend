import { ref } from 'vue'
import { fileError, recentFiles } from '@/components/files/fileState'

export function useProjectFiles(client) {
  const items = ref([]),
    loading = ref(true),
    error = ref('')
  let generation = 0,
    controller
  async function load(project, folder) {
    const current = ++generation
    controller?.abort()
    controller = new AbortController()
    items.value = []
    loading.value = true
    error.value = ''
    try {
      const data = await client.list(project, folder, { signal: controller.signal })
      if (current === generation) items.value = recentFiles(data)
    } catch (cause) {
      if (current === generation) error.value = fileError(cause)
    } finally {
      if (current === generation) loading.value = false
    }
  }
  function dispose() {
    generation++
    controller?.abort()
  }
  return { items, loading, error, load, dispose }
}
