import { computed, readonly, shallowRef } from 'vue'

// O script theme-init.js já restaurou o tema antes do carregamento do app.
// Estado compartilhado entre todas as instâncias do controle e entre rotas.
const theme = shallowRef(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
const isDark = computed(() => theme.value === 'dark')

function toggleTheme() {
  const nextTheme = isDark.value ? 'light' : 'dark'

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

export function useTheme() {
  return { theme: readonly(theme), isDark, toggleTheme }
}
