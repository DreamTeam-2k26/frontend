<script setup>
import { ThumbsDown, ThumbsUp } from 'lucide-vue-next'

// +1/-1 com o voto do usuário destacado. Clicar no voto já dado remove (0).
const {
  score = 0,
  myVote = 0,
  disabled = false,
  busy = false,
  label,
} = defineProps({
  score: { type: Number, default: 0 },
  myVote: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  // Do que é o voto, para os leitores de tela ("discussão", "resposta de Ana").
  label: { type: String, required: true },
})

const emit = defineEmits({ vote: (value) => [-1, 0, 1].includes(value) })

function press(value) {
  if (disabled || busy) return
  emit('vote', myVote === value ? 0 : value)
}
</script>

<template>
  <div class="vote" role="group" :aria-label="`Votos da ${label}`">
    <button
      type="button"
      class="vote__button"
      :class="{ 'vote__button--active': myVote === 1 }"
      :aria-pressed="myVote === 1"
      :aria-label="myVote === 1 ? `Remover concordo da ${label}` : `Concordo com a ${label}`"
      :disabled="disabled || busy"
      @click="press(1)"
    >
      <ThumbsUp :size="15" aria-hidden="true" />
    </button>
    <span class="vote__score" aria-live="polite">
      <span class="visually-hidden">Saldo de votos:</span
      ><span :key="score" class="vote__number">{{ score > 0 ? `+${score}` : score }}</span>
    </span>
    <button
      type="button"
      class="vote__button vote__button--down"
      :class="{ 'vote__button--active': myVote === -1 }"
      :aria-pressed="myVote === -1"
      :aria-label="myVote === -1 ? `Remover discordo da ${label}` : `Discordo da ${label}`"
      :disabled="disabled || busy"
      @click="press(-1)"
    >
      <ThumbsDown :size="15" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.vote {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.125rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-card);
}
.vote__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--color-text-secondary);
  border-radius: 999px;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}
.vote__button:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-bg-hover);
}
.vote__button--active {
  color: var(--color-on-primary);
  background: var(--color-button-primary-bg);
}
.vote__button--active:hover:not(:disabled) {
  color: var(--color-on-primary);
  background: var(--color-button-primary-hover);
}
.vote__button--down.vote__button--active {
  background: var(--color-danger);
}
.vote__button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.vote__score {
  min-width: 1.75rem;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-align: center;
}
.vote__button {
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}
.vote__button:active:not(:disabled) {
  transform: scale(0.9);
}
/* Voto dado: o ícone "salta"; o saldo novo entra de baixo. */
.vote__button--active svg {
  animation: vote-pop 0.35s ease;
}
.vote__number {
  display: inline-block;
  animation: vote-bump 0.3s ease;
}
@keyframes vote-pop {
  40% {
    transform: scale(1.35) rotate(-8deg);
  }
}
@keyframes vote-bump {
  from {
    opacity: 0;
    transform: translateY(0.375rem);
  }
}
@media (prefers-reduced-motion: reduce) {
  .vote__button,
  .vote__button:active:not(:disabled) {
    transition: none;
    transform: none;
  }
  .vote__button--active svg,
  .vote__number {
    animation: none;
  }
}
</style>
