<script setup>
import { Pencil, ArrowUpRight } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps({ project: { type: Object, required: true } })
defineEmits(['edit'])
const roles = { owner: 'Dono', admin: 'Administrador', member: 'Membro' }
</script>

<template>
  <article class="project-card">
    <div class="project-card__cover" aria-hidden="true" />
    <div class="project-card__body">
      <h2>{{ project.name }}</h2>
      <p class="project-card__description">{{ project.description || 'Sem descrição.' }}</p>
      <span class="project-card__role">{{ roles[project.role] || 'Participante' }}</span>
      <div class="project-card__actions">
        <BaseButton disabled :aria-describedby="`project-access-${project.id}`">
          Acessar projeto <ArrowUpRight :size="16" aria-hidden="true" />
        </BaseButton>
        <BaseButton
          v-if="['owner', 'admin'].includes(project.role)"
          variant="ghost"
          :aria-label="`Editar ${project.name}`"
          @click="$emit('edit', project)"
          ><Pencil :size="16" aria-hidden="true" /> Editar</BaseButton
        >
      </div>
      <small :id="`project-access-${project.id}`"
        >O espaço interno do projeto estará disponível em breve.</small
      >
    </div>
  </article>
</template>

<style scoped>
.project-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.project-card__cover {
  position: relative;
  height: 5.75rem;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: linear-gradient(110deg, var(--color-bg-subtle), var(--color-secondary));
}
.project-card__cover::before,
.project-card__cover::after {
  content: '';
  position: absolute;
  width: 9rem;
  height: 9rem;
  border: 1rem solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  border-radius: 50%;
  right: 9%;
  top: -4.5rem;
}
.project-card__cover::after {
  right: -2.5rem;
  top: 1.5rem;
  border-width: 0.5rem;
  border-color: color-mix(in srgb, var(--color-bg-card) 55%, transparent);
}
.project-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-1) var(--space-1);
  overflow-wrap: anywhere;
}
h2 {
  font-size: var(--font-size-md);
}
.project-card__description {
  white-space: pre-wrap;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.project-card__role {
  margin-top: auto;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-bg-subtle);
  font-size: var(--font-size-xs);
}
.project-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
</style>
