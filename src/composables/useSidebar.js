import { readonly, shallowRef, watch } from 'vue'

const STORAGE_KEY = 'sidebar-collapsed'

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// Estado único: header e sidebar usam o mesmo.
const collapsed = shallowRef(readStored())

watch(collapsed, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // Sem storage: só não lembra a escolha.
  }
})

export function useSidebar() {
  function toggle() {
    collapsed.value = !collapsed.value
  }

  return { collapsed: readonly(collapsed), toggle }
}
