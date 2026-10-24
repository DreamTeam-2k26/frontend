import { useRoute, useRouter } from 'vue-router'
import { useAppTransition } from '@/composables/useAppTransition'
import { authDestination } from '@/utils/authRedirect'

// Entrada após autenticação confirmada (senha, cadastro ou Google): a marca cobre a troca de layout
// e revela o destino seguro do ?redirect= (convite, projeto, tarefa) ou a Home.
export function useAuthEntry() {
  const router = useRouter()
  const route = useRoute()
  const { cover } = useAppTransition()

  return function enterApp() {
    return cover(() => router.push(authDestination(route.query.redirect))).catch(() => {
      // Navegação cancelada: a camada já saiu e a pessoa continua na tela atual.
    })
  }
}
