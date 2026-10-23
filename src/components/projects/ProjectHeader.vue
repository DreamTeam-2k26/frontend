<script setup>
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps({ project: { type: Object, required: true } })
const roles = { owner: 'Dono', admin: 'Administrador', member: 'Membro' }
</script>

<template>
  <header class="project-header">
    <div class="project-header__content">
      <div class="project-header__heading">
        <h1 id="project-title">{{ project.name }}</h1>
        <span class="project-header__role">{{ roles[project.role] || 'Papel não informado' }}</span>
      </div>
      <p>{{ project.description || 'Este projeto ainda não tem descrição.' }}</p>
    </div>
    <BaseButton
      v-if="['owner', 'admin'].includes(project.role)"
      variant="secondary"
      :to="{ name: 'projects' }"
    >
      Gerenciar em Meus Projetos
    </BaseButton>
  </header>
</template>

<style scoped>
.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-6);
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
