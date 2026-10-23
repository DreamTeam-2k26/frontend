import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Itens de menu vindos das rotas com `meta.nav: { label, icon, order }`.
 * Para pôr uma página no menu, basta adicionar `meta.nav` na rota.
 */
export function useNavigation() {
  const router = useRouter()
  const route = useRoute()

  const items = router
    .getRoutes()
    .filter((record) => record.name && record.meta.nav)
    .map((record) => ({
      name: record.name,
      to: { name: record.name },
      label: record.meta.nav.label,
      icon: record.meta.nav.icon,
      order: record.meta.nav.order ?? 0,
      // Raiz só fica ativa em match exato; senão marca em toda página.
      exact: record.meta.nav.exact ?? record.path === '/',
    }))
    .sort((a, b) => a.order - b.order)

  const pageTitle = computed(() => route.meta.title ?? route.meta.nav?.label ?? '')

  return { items, pageTitle }
}
