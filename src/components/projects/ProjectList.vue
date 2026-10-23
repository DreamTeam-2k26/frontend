<script setup>
import ProjectCard from './ProjectCard.vue'
defineProps({ projects: { type: Array, required: true } })
defineEmits(['edit'])
</script>

<template>
  <ul class="project-list" aria-label="Projetos">
    <li v-for="project in projects" :key="project.id">
      <ProjectCard :project="project" @edit="$emit('edit', $event)" />
    </li>
  </ul>
</template>

<style scoped>
.project-list {
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
