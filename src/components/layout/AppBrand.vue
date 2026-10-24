<script setup>
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { appConfig } from '@/config/app'

const props = defineProps({ compact: Boolean })
// Monta no primeiro recolhimento e mantém para preservar o crossfade ao expandir.
const symbolMounted = ref(props.compact)
watch(
  () => props.compact,
  (compact) => {
    if (compact) symbolMounted.value = true
  },
)
</script>

<template>
  <RouterLink
    :to="{ name: 'home' }"
    class="brand"
    :class="{ 'brand--compact': compact && appConfig.logoCompact }"
    :aria-label="appConfig.name"
  >
    <span class="brand__full" aria-hidden="true">
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
    </span>
    <span v-if="symbolMounted && appConfig.logoCompact" class="brand__symbol" aria-hidden="true">
      <img :src="appConfig.logoCompact" alt="" width="44" height="24" class="brand__symbol-image" />
    </span>
  </RouterLink>
</template>

<style scoped>
.brand {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--color-logo);
  border-radius: var(--radius-sm);
  width: 8rem;
  height: var(--space-8);
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.brand--compact {
  width: 2.75rem;
}
.brand__full {
  position: absolute;
  inset: 0 auto 0 0;
  width: 8rem;
  display: inline-flex;
  align-items: center;
  transform-origin: left center;
  transition:
    opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}
.brand--compact .brand__full {
  opacity: 0;
  transform: scale(0.85);
  pointer-events: none;
}
.brand__symbol {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  inset: 0 auto 0 0;
  width: 2.75rem;
  overflow: hidden;
  opacity: 0;
  transform: scale(0.9);
  transition:
    opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  will-change: opacity, transform;
}
.brand--compact .brand__symbol {
  opacity: 1;
  transform: none;
}
@starting-style {
  .brand--compact .brand__symbol {
    opacity: 0;
    transform: scale(0.9);
  }
}
.brand__symbol-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
@media (prefers-reduced-motion: reduce) {
  .brand,
  .brand__full,
  .brand__symbol {
    transition: none;
  }
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
