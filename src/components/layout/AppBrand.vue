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
      <!-- Sem logo própria para o escuro: a mesma imagem vira máscara na cor --color-logo. -->
      <span
        v-if="!appConfig.logoDark"
        class="brand__mono"
        :style="{ '--brand-logo': `url(${appConfig.logo})` }"
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
.brand__logo--dark,
.brand__mono {
  display: none;
}
/* `:root[...]` em vez de `:global(...)`: o CSS com escopo descartava as regras de :global. */
:root[data-theme='dark'] .brand {
  position: relative;
}
:root[data-theme='dark'] .brand__logo--light {
  display: none;
}
:root[data-theme='dark'] .brand__logo--dark {
  display: block;
}
:root[data-theme='dark'] .brand__logo:not(.brand__logo--dark) {
  visibility: hidden;
}
:root[data-theme='dark'] .brand__mono {
  position: absolute;
  inset: 0;
  display: block;
  background-color: var(--color-logo);
  -webkit-mask: var(--brand-logo) left center / contain no-repeat;
  mask: var(--brand-logo) left center / contain no-repeat;
}
</style>
