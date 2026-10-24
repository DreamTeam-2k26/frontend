import { ref } from 'vue'
import { activityError } from '@/components/activities/activityState'

export function useProjectActivities(client) {
  const items = ref([]),
    warnings = ref([]),
    loading = ref(false),
    error = ref('')
  let generation = 0,
    controller
  async function load(project) {
    const current = ++generation
    controller?.abort()
    controller = new AbortController()
    items.value = []
    warnings.value = []
    error.value = ''
    loading.value = true
    try {
      const result = await client.list(project, { signal: controller.signal })
      if (current === generation) {
        items.value = result.items
        warnings.value = result.warnings || []
      }
    } catch (cause) {
      if (current === generation) error.value = activityError(cause)
    } finally {
      if (current === generation) loading.value = false
    }
  }
  function dispose() {
    generation++
    controller?.abort()
    items.value = []
    warnings.value = []
  }
  return { items, warnings, loading, error, load, dispose }
}
