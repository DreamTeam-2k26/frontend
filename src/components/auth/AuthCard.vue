<script setup>
import { appConfig } from '@/config/app'

const { title, subtitle = '' } = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <section class="auth-card">
    <header class="auth-card__header">
      <div class="auth-card__brand">
        <component :is="appConfig.logo" :size="28" aria-hidden="true" />
        <span>{{ appConfig.name }}</span>
      </div>
      <h1 class="auth-card__title">{{ title }}</h1>
      <p v-if="subtitle" class="auth-card__subtitle">{{ subtitle }}</p>
    </header>

    <slot />

    <footer v-if="$slots.footer" class="auth-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.auth-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  width: 100%;
  min-width: 0;
  max-width: 28rem;
  padding: var(--space-8);
  color: var(--color-text);
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.auth-card__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: center;
}

.auth-card__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  color: var(--color-logo);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.auth-card__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}

.auth-card__subtitle {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}

.auth-card__footer {
  color: var(--color-text-secondary);
  padding-top: var(--space-5);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  text-align: center;
}

@media (max-width: 480px) {
  .auth-card {
    padding: var(--space-6) var(--space-5);
  }
}
</style>
