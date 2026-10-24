<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Video } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { participantsText } from '../lib/callRules'
import { useCallNotifier } from '../stores/callNotifier'

// Liga os avisos de chamada em todas as páginas logadas e mostra um atalho enquanto há chamada
// em andamento nos seus projetos (some dentro da própria chamada).
const notifier = useCallNotifier()
const auth = useAuthStore()
const route = useRoute()

const call = computed(() => (route.name === 'call' ? null : (notifier.joinableLive[0] ?? null)))

onMounted(async () => {
  const user = await auth.fetchUser().catch(() => null)

  notifier.start(user?.id ?? auth.user?.id ?? null)
})
onBeforeUnmount(() => notifier.stop())
</script>

<template>
  <Transition name="pill">
    <RouterLink
      v-if="call"
      class="pill"
      :to="{ name: 'call', params: { id: call.project, callId: call.id } }"
      :aria-label="`Entrar na chamada ${call.title} do projeto ${call.project_name}`"
    >
      <span class="pill__icon"><Video :size="18" aria-hidden="true" /></span>
      <span class="pill__text">
        <strong>Chamada em andamento</strong>
        <small>{{ call.project_name }} · {{ participantsText(call.participants_count) }}</small>
      </span>
      <span class="pill__action">Entrar</span>
    </RouterLink>
  </Transition>
</template>

<style scoped>
.pill {
  position: fixed;
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: 80;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  max-width: min(22rem, calc(100vw - 2rem));
  padding: var(--space-3) var(--space-4);
  color: var(--color-text);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-full);
  background: var(--color-background);
  box-shadow: var(--shadow-md);
  text-decoration: none;
}

.pill__icon {
  display: inline-flex;
  flex-shrink: 0;
  padding: var(--space-2);
  color: var(--color-success);
  border-radius: 50%;
  background: var(--color-success-soft);
}

.pill__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: var(--font-size-sm);
}

.pill__text small {
  overflow: hidden;
  color: var(--color-text-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pill__action {
  flex-shrink: 0;
  padding: 0.25rem var(--space-3);
  color: var(--color-on-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full);
  background: var(--color-button-primary-bg);
}

.pill-enter-active,
.pill-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.pill-enter-from,
.pill-leave-to {
  opacity: 0;
  transform: translateY(0.75rem);
}

@media (max-width: 800px) {
  /* acima da barra de navegação do celular */
  .pill {
    bottom: 5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pill-enter-active,
  .pill-leave-active {
    transition: none;
  }
}
</style>
