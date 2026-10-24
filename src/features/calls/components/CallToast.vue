<script setup>
import { Video } from 'lucide-vue-next'

// Conteúdo do aviso de chamada (renderizado dentro do vue3-toastify).
defineProps({
  title: { type: String, required: true },
  project: { type: String, required: true },
  subtitle: { type: String, default: '' },
  action: { type: String, default: 'Entrar' },
})
</script>

<template>
  <div class="call-toast">
    <span class="call-toast__icon"><Video :size="20" aria-hidden="true" /></span>
    <div class="call-toast__text">
      <strong>{{ title }}</strong>
      <span
        >{{ project }}<template v-if="subtitle"> · {{ subtitle }}</template></span
      >
    </div>
    <button type="button" class="call-toast__open">{{ action }}</button>
  </div>
</template>

<style>
/* Global de propósito: o vue3-toastify renderiza o cartão fora deste componente. */
.Toastify__toast.call-toast-card {
  min-height: 0;
  padding: 0.75rem 0.875rem;
  overflow: hidden;
  color: var(--color-text);
  font-family: inherit;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg, 1rem);
  background: var(--color-background);
  box-shadow: var(--shadow-md);
  cursor: pointer;
}

.call-toast-card .Toastify__toast-body {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  padding: 0;
}

.call-toast-card .Toastify__toast-body > div {
  width: 100%;
  min-width: 0;
}

.Toastify__toast-container--top-center:has(.call-toast-card) {
  width: min(26rem, calc(100vw - 2rem));
}

.call-toast-card .Toastify__progress-bar {
  height: 3px;
  background: var(--color-success);
  opacity: 0.85;
}

.call-toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.call-toast__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  color: var(--color-success);
  border-radius: 50%;
  background: var(--color-success-soft);
}

.call-toast__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  font-size: var(--font-size-sm);
}

.call-toast__text strong,
.call-toast__text span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.call-toast__text span {
  color: var(--color-text-secondary);
}

.call-toast__open {
  flex-shrink: 0;
  padding: 0.375rem 0.875rem;
  color: var(--color-on-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-full, 999px);
  background: var(--color-button-primary-bg);
}
</style>
