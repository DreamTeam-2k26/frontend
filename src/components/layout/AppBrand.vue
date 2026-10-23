<script setup>
import { RouterLink } from 'vue-router'
import { appConfig } from '@/config/app'
</script>

<template>
  <RouterLink :to="{ name: 'home' }" class="brand" :aria-label="appConfig.name">
    <template v-if="appConfig.logo">
      <img
        :src="appConfig.logo"
        alt=""
        class="brand__logo"
        :class="{ 'brand__logo--light': appConfig.logoDark }"
      />
      <img
        v-if="appConfig.logoDark"
        :src="appConfig.logoDark"
        alt=""
        class="brand__logo brand__logo--dark"
      />
    </template>
    <span v-else class="brand__name">{{ appConfig.name }}</span>
  </RouterLink>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--color-logo);
  border-radius: var(--radius-sm);
}
.brand:hover {
  color: var(--color-logo);
}
.brand__name {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  letter-spacing: -0.06em;
  white-space: nowrap;
}
.brand__logo {
  width: auto;
  max-width: 8rem;
  height: var(--space-8);
  object-fit: contain;
}
.brand__logo--dark {
  display: none;
}
:global([data-theme='dark']) .brand:has(.brand__logo:only-child) {
  padding: var(--space-1) var(--space-2);
  background-color: var(--color-secondary);
}
:global([data-theme='dark']) .brand__logo--light {
  display: none;
}
:global([data-theme='dark']) .brand__logo--dark {
  display: block;
}
</style>
