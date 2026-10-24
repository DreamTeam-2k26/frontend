<script setup>
import { AnimatePresence, motion } from 'motion-v'
import { listItemMotion } from '@/utils/motion'
import ProjectCard from './ProjectCard.vue'
defineProps({
  projects: { type: Array, required: true },
  // Chamadas em andamento (da API), para marcar os projetos que estão em reunião.
  liveCalls: { type: Array, default: () => [] },
})
defineEmits(['edit'])
</script>

<template>
  <ul class="project-list" aria-label="Projetos">
    <!-- Busca e atualizações: cada card entra, sai e se reposiciona pelo id, sem remontar a lista. -->
    <AnimatePresence mode="popLayout">
      <motion.li
        v-for="(project, index) in projects"
        :key="project.id"
        layout
        v-bind="listItemMotion(index)"
      >
        <ProjectCard
          :project="project"
          :live-call="liveCalls.find((call) => call.project === project.id) ?? null"
          @edit="$emit('edit', $event)"
        />
      </motion.li>
    </AnimatePresence>
  </ul>
</template>

<style scoped>
.project-list {
  position: relative;
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
  .project-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 650px) {
  .project-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
