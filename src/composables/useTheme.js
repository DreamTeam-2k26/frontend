import { computed, readonly, shallowRef } from 'vue'
import { prefersReducedMotion } from '@/utils/motion'

// O script theme-init.js já restaurou o tema antes do carregamento do app.
// Estado compartilhado entre todas as instâncias do controle e entre rotas.
const theme = shallowRef(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
const isDark = computed(() => theme.value === 'dark')

function applyTheme(nextTheme) {
  if (nextTheme === 'dark') {
    document.documentElement.dataset.theme = 'dark'
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  theme.value = nextTheme

  try {
    localStorage.setItem('fluxo-theme', nextTheme)
  } catch {
    // Mantém a alternância funcionando mesmo sem permissão para persistir.
  }
}

// Superfícies trocam em crossfade (View Transitions) onde houver suporte; senão, na hora.
function toggleTheme() {
  const nextTheme = isDark.value ? 'light' : 'dark'
  if (!document.startViewTransition || prefersReducedMotion()) {
    applyTheme(nextTheme)
    return
  }
  document.startViewTransition(() => applyTheme(nextTheme))
}

export function useTheme() {
  return { theme: readonly(theme), isDark, toggleTheme }
}
