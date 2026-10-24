<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, Lightbulb } from 'lucide-vue-next'

// Atalho da Visão geral para o Brainstorm. A contagem real vem de quem usa (ProjectDetailView).
const { projectId, open = null } = defineProps({
  projectId: { type: [String, Number], required: true },
  // Discussões abertas; null enquanto carrega ou se a contagem falhar.
  open: { type: Number, default: null },
})

const caption = computed(() => {
  if (open == null) return 'Ideias e decisões da equipe'
  if (!open) return 'Nenhuma discussão aberta'
  return `${open} ${open === 1 ? 'discussão aberta' : 'discussões abertas'}`
})
const to = computed(() => ({
  name: 'project-detail',
  params: { id: String(projectId) },
  query: { aba: 'brainstorm' },
}))
</script>

<template>
  <section class="shortcut" aria-labelledby="brainstorm-shortcut-title">
    <div class="shortcut__heading">
      <h2 id="brainstorm-shortcut-title">Brainstorm</h2>
      <Lightbulb :size="17" aria-hidden="true" />
    </div>
    <p class="shortcut__caption">{{ caption }}</p>
    <RouterLink :to="to" class="shortcut__link">
      Abrir discussões <ArrowRight :size="15" aria-hidden="true" />
    </RouterLink>
  </section>
</template>

<style scoped>
.shortcut {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-6);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.shortcut__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-secondary);
}
.shortcut__heading h2 {
  color: var(--color-text);
  font-size: var(--font-size-md);
}
.shortcut__caption {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.shortcut__link {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-1);
  min-height: 2.75rem;
  color: var(--color-primary-hover);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.shortcut__link:hover {
  text-decoration: underline;
}
</style>
