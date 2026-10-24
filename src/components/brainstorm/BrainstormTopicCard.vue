<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { MessageSquare, ThumbsUp } from 'lucide-vue-next'
import BrainstormStatusBadge from './BrainstormStatusBadge.vue'
import { categoryLabel, formatWhen, preview } from '@/utils/brainstorm'

// Linha da lista estilo fórum. O título é o link (o card inteiro não vira botão gigante).
const { topic, projectId } = defineProps({
  topic: { type: Object, required: true },
  projectId: { type: [String, Number], required: true },
})

const to = computed(() => ({
  name: 'project-brainstorm-topic',
  params: { id: String(projectId), topicId: String(topic.id) },
}))
const score = computed(() => (topic.score > 0 ? `+${topic.score}` : String(topic.score ?? 0)))
const replies = computed(() =>
  topic.replies_count === 1 ? '1 resposta' : `${topic.replies_count ?? 0} respostas`,
)
const excerpt = computed(() => preview(topic.context, 180))
</script>

<template>
  <article class="topic-card">
    <div class="topic-card__body">
      <div class="topic-card__meta">
        <span class="topic-card__category">{{ categoryLabel(topic.category) }}</span>
        <BrainstormStatusBadge :status="topic.status" :in-review="topic.in_review" />
      </div>
      <h3 class="topic-card__title">
        <RouterLink :to="to" class="topic-card__link">{{ topic.title }}</RouterLink>
      </h3>
      <p v-if="excerpt" class="topic-card__excerpt">{{ excerpt }}</p>
      <p class="topic-card__author">
        {{ topic.author_name || 'Usuário removido' }} ·
        <time :datetime="topic.created_at">{{ formatWhen(topic.created_at) }}</time>
      </p>
    </div>
    <dl class="topic-card__stats">
      <div class="topic-card__stat">
        <dt>
          <ThumbsUp :size="14" aria-hidden="true" /><span class="visually-hidden"
            >Saldo de votos</span
          >
        </dt>
        <dd>{{ score }}</dd>
      </div>
      <div class="topic-card__stat">
        <dt>
          <MessageSquare :size="14" aria-hidden="true" /><span class="visually-hidden"
            >Respostas</span
          >
        </dt>
        <dd>{{ replies }}</dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
.topic-card {
  position: relative;
  display: flex;
  gap: var(--space-4);
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  transition:
    border-color 0.15s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.topic-card:hover {
  border-color: var(--color-secondary);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--color-text) 8%, transparent);
  transform: translateY(-2px);
}
@media (prefers-reduced-motion: reduce) {
  .topic-card,
  .topic-card:hover {
    transform: none;
    transition: none;
  }
}
.topic-card:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.topic-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}
.topic-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
.topic-card__category {
  padding: 0.125rem var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
}
.topic-card__title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}
.topic-card__link {
  color: var(--color-text);
}
/* O link cobre o card todo para facilitar o clique, mantendo um único alvo de foco. */
.topic-card__link::after {
  position: absolute;
  inset: 0;
  content: '';
}
.topic-card__link:focus-visible {
  outline: none;
}
.topic-card:hover .topic-card__link {
  color: var(--color-primary-hover);
}
.topic-card__excerpt {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  overflow-wrap: anywhere;
}
.topic-card__author {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.topic-card__stats {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: var(--space-2);
  align-items: flex-end;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.topic-card__stat {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.topic-card__stat dd {
  white-space: nowrap;
}
@media (max-width: 600px) {
  .topic-card {
    flex-direction: column;
    padding: var(--space-4);
  }
  .topic-card__stats {
    flex-direction: row;
    gap: var(--space-4);
  }
}
</style>
