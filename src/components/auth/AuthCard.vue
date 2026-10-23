<script setup>
// A marca fica no painel do AuthLayout; aqui só o conteúdo do formulário.
const { title, subtitle = '' } = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <section class="auth-card">
    <header class="auth-card__header">
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
  gap: var(--space-5);
  width: 100%;
  min-width: 0;
  max-width: 24rem;
  color: var(--color-text);
}

.auth-card__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.auth-card__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  letter-spacing: -0.02em;
}

.auth-card__subtitle {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}

.auth-card__footer {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
