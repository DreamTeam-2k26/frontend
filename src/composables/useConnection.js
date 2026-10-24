import { ref, onMounted, onBeforeUnmount } from 'vue'
export function useConnection(onReconnect = () => {}) {
  const offline = ref(!navigator.onLine)
  function sync() {
    offline.value = !navigator.onLine
    if (!offline.value) onReconnect()
  }
  onMounted(() => {
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('online', sync)
    window.removeEventListener('offline', sync)
  })
  return { offline }
}
