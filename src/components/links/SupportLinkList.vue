<script setup>
import { ExternalLink, Link2, Pencil, Trash2 } from 'lucide-vue-next'
import { linkDate, linkHost } from '@/utils/supportLinks'

// Lista de links de apoio (gerais ou da tarefa). Texto vem só por interpolação: nada de HTML do usuário.
const {
  links,
  showMeta = false,
  disabled = false,
} = defineProps({
  links: { type: Array, required: true },
  // Autor e data (seção do projeto); o detail da tarefa mostra só título e domínio.
  showMeta: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits({ edit: (link) => !!link, remove: (link) => !!link })
</script>

<template>
  <ul class="link-list">
    <li v-for="link in links" :key="link.id" class="link-list__item">
      <span class="link-list__tile" aria-hidden="true"><Link2 :size="16" /></span>
      <div class="link-list__body">
        <a class="link-list__anchor" :href="link.url" target="_blank" rel="noopener noreferrer">
          <span class="link-list__name">{{ link.title }}</span>
          <ExternalLink class="link-list__external" :size="13" aria-hidden="true" />
          <span class="visually-hidden">(abre em nova aba)</span>
        </a>
        <span class="link-list__meta">
          <span class="link-list__host">{{ linkHost(link.url) }}</span>
          <template v-if="showMeta">
            <span v-if="link.created_by_name"> · {{ link.created_by_name }}</span>
            <time v-if="linkDate(link.created_at)" :datetime="link.created_at">
              · {{ linkDate(link.created_at) }}</time
            >
          </template>
        </span>
      </div>
      <div class="link-list__actions">
        <button
          type="button"
          class="link-list__action"
          :disabled="disabled"
          :aria-label="`Editar link ${link.title}`"
          @click="emit('edit', link)"
        >
          <Pencil :size="15" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="link-list__action link-list__action--danger"
          :disabled="disabled"
          :aria-label="`Excluir link ${link.title}`"
          @click="emit('remove', link)"
        >
          <Trash2 :size="15" aria-hidden="true" />
        </button>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.link-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.link-list__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 3rem;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
}
.link-list__item:hover {
  background: var(--color-bg-hover);
}
.link-list__tile {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  color: var(--color-info);
  background: var(--color-info-soft);
  border-radius: var(--radius-sm);
}
.link-list__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.link-list__anchor {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-1);
  max-width: 100%;
  color: var(--color-text);
  font-size: var(--font-size-sm);
}
.link-list__anchor:hover .link-list__name {
  color: var(--color-primary-hover);
  text-decoration: underline;
}
.link-list__name {
  overflow: hidden;
  font-weight: var(--font-weight-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.link-list__external {
  flex-shrink: 0;
  color: var(--color-text-secondary);
}
.link-list__meta {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.link-list__actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity 0.12s ease;
}
.link-list__item:hover .link-list__actions,
.link-list__actions:focus-within {
  opacity: 1;
}
@media (hover: none) {
  .link-list__actions {
    opacity: 1;
  }
}
.link-list__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
}
.link-list__action:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-bg-subtle);
}
.link-list__action--danger:hover:not(:disabled) {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}
.link-list__action:disabled {
  color: var(--color-disabled);
  cursor: not-allowed;
}
</style>
