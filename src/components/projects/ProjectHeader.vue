<script setup>
import BaseButton from '@/components/ui/BaseButton.vue'
import { KanbanSquare, Plus } from 'lucide-vue-next'

defineProps({ project: { type: Object, required: true } })
</script>

<template>
  <header class="project-header">
    <div class="project-header__content">
      <div class="project-header__heading">
        <h1 id="project-title">{{ project.name }}</h1>
      </div>
      <p>{{ project.description || 'Este projeto ainda não tem descrição.' }}</p>
    </div>
    <div class="project-header__actions">
      <BaseButton variant="secondary" :to="{ name: 'project-kanban', params: { id: project.id } }">
        <KanbanSquare :size="16" aria-hidden="true" /> Abrir Kanban
      </BaseButton>
      <BaseButton :to="{ name: 'project-kanban', params: { id: project.id }, query: { new: '1' } }">
        <Plus :size="16" aria-hidden="true" /> Nova tarefa
      </BaseButton>
    </div>
  </header>
</template>

<style scoped>
.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-6);
}
.project-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.project-header__content {
  min-width: 0;
  flex: 1;
}
.project-header__heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}
h1 {
  font-size: var(--font-size-xl);
  overflow-wrap: anywhere;
}
.project-header__role {
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text);
  font-size: var(--font-size-xs);
}
p {
  margin-top: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (max-width: 700px) {
  .project-header {
    flex-direction: column;
    gap: var(--space-4);
  }
}
</style>
