<script setup>
import { ChevronRight } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import ProjectCard from '@/components/projects/ProjectCard.vue'
defineProps({
  projects: { type: Array, required: true },
  demo: { type: Boolean, default: false },
})
</script>

<template>
  <section aria-labelledby="recent-projects-title" class="recent-projects">
    <header class="recent-projects__header">
      <h2 id="recent-projects-title">Meus projetos</h2>
      <RouterLink :to="{ name: 'projects' }" class="recent-projects__link">
        Ver todos <ChevronRight :size="16" aria-hidden="true" />
      </RouterLink>
    </header>
    <ul class="recent-projects__list" aria-label="Projetos atualizados recentemente">
      <li v-for="project in projects" :key="project.id">
        <ProjectCard :project="project" compact :preview="demo" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.recent-projects__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}
h2 {
  font-size: var(--font-size-md);
}
.recent-projects__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
}
.recent-projects__link:hover {
  color: var(--color-primary);
}
.recent-projects__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}
li {
  display: flex;
  min-width: 0;
}
li > * {
  width: 100%;
}
@media (max-width: 1150px) {
  .recent-projects__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 650px) {
  .recent-projects__list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
