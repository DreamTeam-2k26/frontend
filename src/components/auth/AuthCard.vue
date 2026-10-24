<script setup>
import { useAppTransition } from '@/composables/useAppTransition'

// A marca fica no painel do AuthLayout; aqui só o conteúdo do formulário.
const { title, subtitle = '' } = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})

// Os elementos entram em sequência quando a camada de marca sai (ou na hora, se ela já saiu).
const { contentReady } = useAppTransition()
</script>

<template>
  <section class="auth-card" :class="{ 'auth-card--ready': contentReady }">
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

/* Entrada em sequência: título, descrição, cada campo, ações e rodapé (passos de 45 ms). */
.auth-card__title,
.auth-card__subtitle,
.auth-card :deep(.auth-form > *),
.auth-card :deep(.google-sign-in),
.auth-card__footer {
  opacity: 0;
}

.auth-card--ready .auth-card__title,
.auth-card--ready .auth-card__subtitle,
.auth-card--ready :deep(.auth-form > *),
.auth-card--ready :deep(.google-sign-in),
.auth-card--ready .auth-card__footer {
  animation: auth-rise var(--motion-slow) var(--ease-flow) both;
}

.auth-card--ready .auth-card__subtitle {
  animation-delay: 45ms;
}
.auth-card--ready :deep(.auth-form > :nth-child(1)) {
  animation-delay: 90ms;
}
.auth-card--ready :deep(.auth-form > :nth-child(2)) {
  animation-delay: 135ms;
}
.auth-card--ready :deep(.auth-form > :nth-child(3)) {
  animation-delay: 180ms;
}
.auth-card--ready :deep(.auth-form > :nth-child(n + 4)) {
  animation-delay: 225ms;
}
.auth-card--ready :deep(.google-sign-in) {
  animation-delay: 270ms;
}
.auth-card--ready .auth-card__footer {
  animation-delay: 300ms;
}

@keyframes auth-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* Sem movimento: tudo visível de imediato (a regra global não zera os atrasos). */
@media (prefers-reduced-motion: reduce) {
  .auth-card__title,
  .auth-card__subtitle,
  .auth-card :deep(.auth-form > *),
  .auth-card :deep(.google-sign-in),
  .auth-card__footer {
    opacity: 1;
    animation: none !important;
  }
}
</style>
