import { onBeforeUnmount, onMounted } from 'vue'

// Trava a rolagem da página enquanto um modal/painel está aberto. Contador: com um modal sobre
// outro (ex.: confirmação dentro do painel), a página só destrava quando o último fecha.
let locks = 0
let previous = { overflow: '', paddingRight: '' }

function lock() {
  if (locks++ > 0) return
  const root = document.documentElement
  // Compensa a barra de rolagem que some, para o conteúdo não pular para o lado.
  const scrollbar = window.innerWidth - root.clientWidth
  previous = { overflow: root.style.overflow, paddingRight: root.style.paddingRight }
  root.style.overflow = 'hidden'
  if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`
}

function unlock() {
  if (locks === 0 || --locks > 0) return
  const root = document.documentElement
  root.style.overflow = previous.overflow
  root.style.paddingRight = previous.paddingRight
}

export function useScrollLock() {
  onMounted(lock)
  onBeforeUnmount(unlock)
}
