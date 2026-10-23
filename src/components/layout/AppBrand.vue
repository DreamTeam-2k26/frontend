<script setup>
import { RouterLink } from 'vue-router'
import { appConfig } from '@/config/app'
</script>

<template>
  <RouterLink :to="{ name: 'home' }" class="brand" :aria-label="appConfig.name">
    <component :is="appConfig.logo" class="brand__logo" :size="28" aria-hidden="true" />
    <span class="brand__name">{{ appConfig.name }}</span>
  </RouterLink>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.125rem;
}

.brand__logo {
  color: var(--color-primary);
}

.brand__name {
  white-space: nowrap;
}
</style>
