<script setup>
import { FolderOpen, SearchX } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
defineProps({ searching: Boolean })
defineEmits(['create', 'clear'])
</script>

<template>
  <div class="empty" role="status">
    <component :is="searching ? SearchX : FolderOpen" :size="36" aria-hidden="true" />
    <h2>
      {{ searching ? 'Nenhum resultado encontrado' : 'Você ainda não participa de projetos' }}
    </h2>
    <p>
      {{
        searching
          ? 'Tente buscar por outro nome.'
          : 'Crie um projeto para começar a organizar suas ideias em equipe.'
      }}
    </p>
    <BaseButton v-if="searching" variant="secondary" @click="$emit('clear')"
      >Limpar busca</BaseButton
    >
    <BaseButton v-else @click="$emit('create')">Novo projeto</BaseButton>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-4);
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}
p,
svg {
  color: var(--color-text-secondary);
}
h2 {
  font-size: var(--font-size-lg);
}
</style>
