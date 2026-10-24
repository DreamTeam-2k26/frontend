<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { CircleCheck, ExternalLink } from 'lucide-vue-next'
import { formatWhen } from '@/utils/brainstorm'

// Decisão aprovada (vigente) com os links para as tarefas criadas ou vinculadas no Kanban.
const {
  decision,
  projectId,
  inReview = false,
} = defineProps({
  decision: { type: Object, required: true },
  projectId: { type: [String, Number], required: true },
  inReview: { type: Boolean, default: false },
})

const taskLink = (taskId) => ({
  name: 'project-kanban',
  params: { id: String(projectId) },
  query: { task: String(taskId) },
})
const tasks = computed(() => decision.tasks ?? [])
</script>

<template>
  <article class="decision" aria-labelledby="decision-title">
    <header class="decision__header">
      <h3 id="decision-title" class="decision__title">
        <CircleCheck :size="18" aria-hidden="true" /> Decisão vigente · versão {{ decision.cycle }}
      </h3>
      <p class="decision__meta">
        Aprovada por {{ decision.approved_by_name || 'usuário removido' }} em
        <time :datetime="decision.approved_at">{{ formatWhen(decision.approved_at) }}</time>
      </p>
    </header>
    <p v-if="inReview" class="decision__review" role="note">
      A discussão foi reaberta: esta decisão continua valendo até a aprovação da nova versão.
    </p>
    <p class="decision__text">{{ decision.text }}</p>
    <p v-if="decision.justification" class="decision__justification">
      <strong>Justificativa:</strong> {{ decision.justification }}
    </p>
    <section class="decision__tasks" aria-label="Tarefas da decisão">
      <h4>Tarefas</h4>
      <ul v-if="tasks.length" class="decision__task-list">
        <li v-for="item in tasks" :key="`${item.task}-${item.title}`">
          <RouterLink v-if="item.task" :to="taskLink(item.task)" class="decision__task-link">
            {{ item.title }} <ExternalLink :size="13" aria-hidden="true" />
          </RouterLink>
          <span v-else class="decision__task-removed">{{ item.title }} (tarefa excluída)</span>
          <span class="decision__task-kind">{{
            item.created ? 'criada pela decisão' : 'tarefa existente vinculada'
          }}</span>
        </li>
      </ul>
      <p v-else class="decision__empty">Aprovada só com o texto, sem tarefas.</p>
    </section>
  </article>
</template>

<style scoped>
.decision {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px solid var(--color-status-done);
  border-radius: var(--radius-md);
  background: var(--color-success-soft);
}
.decision__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-status-done);
  font-size: var(--font-size-md);
}
.decision__meta,
.decision__task-kind,
.decision__empty {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.decision__review {
  padding: var(--space-2) var(--space-3);
  color: var(--color-info);
  font-size: var(--font-size-sm);
  border: 1px solid currentColor;
  border-radius: var(--radius-md);
}
.decision__text,
.decision__justification {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.decision__tasks h4 {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
}
.decision__task-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.decision__task-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}
.decision__task-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-primary-hover);
  font-weight: var(--font-weight-medium);
}
.decision__task-link:hover {
  text-decoration: underline;
}
.decision__task-removed {
  color: var(--color-text-secondary);
}
/* Decisão aprovada chega com um selo que "carimba". */
.decision {
  animation: decision-in 0.4s ease both;
}
.decision__title svg {
  animation: decision-stamp 0.5s 0.2s ease both;
}
@keyframes decision-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
}
@keyframes decision-stamp {
  0% {
    opacity: 0;
    transform: scale(1.8) rotate(-20deg);
  }
  70% {
    opacity: 1;
    transform: scale(0.9);
  }
}
@media (prefers-reduced-motion: reduce) {
  .decision,
  .decision__title svg {
    animation: none;
  }
}
</style>
