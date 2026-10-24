<script setup>
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import BrainstormTornado from './BrainstormTornado.vue'

// Enquanto a IA gera a síntese: tornado com as ideias da equipe orbitando, frases do que ela está
// fazendo e o tempo decorrido. Com `finishing`, as ideias entram no tornado e então `done`.
// Só visual: não muda nada da chamada.
const { ideas = [], finishing = false } = defineProps({
  ideas: { type: Array, default: () => [] },
  finishing: { type: Boolean, default: false },
})

const emit = defineEmits({ done: null })

const STEPS = [
  'Lendo a discussão e o contexto…',
  'Seguindo as respostas e as threads…',
  'Comparando os votos da equipe…',
  'Procurando tarefas parecidas no Kanban…',
  'Escrevendo a síntese…',
]
const STEP_SECONDS = 4

const elapsed = shallowRef(0)
let timer
onMounted(() => {
  timer = setInterval(() => (elapsed.value += 1), 1000)
})
onBeforeUnmount(() => clearInterval(timer))

// Avança pelas frases e fica na última até a resposta chegar.
const stepIndex = computed(() =>
  Math.min(Math.floor(elapsed.value / STEP_SECONDS), STEPS.length - 1),
)
const stepText = computed(() =>
  finishing ? 'Juntando as ideias na síntese…' : STEPS[stepIndex.value],
)
const clock = computed(() => {
  const minutes = Math.floor(elapsed.value / 60)
  const seconds = String(elapsed.value % 60).padStart(2, '0')
  return minutes ? `${minutes}min ${seconds}s` : `${elapsed.value}s`
})
</script>

<template>
  <div class="thinking" role="status" aria-live="polite">
    <BrainstormTornado :ideas="ideas" :finishing="finishing" @done="emit('done')" />

    <div class="thinking__text">
      <p class="thinking__title">{{ finishing ? 'Síntese pronta' : 'A IA está pensando' }}</p>
      <Transition name="thinking-step" mode="out-in">
        <p :key="stepText" class="thinking__step">{{ stepText }}</p>
      </Transition>
      <p class="thinking__hint">
        <span class="visually-hidden">Tempo decorrido:</span>{{ clock }} · pode levar até 2 minutos
      </p>
    </div>
  </div>
</template>

<style scoped>
.thinking {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-6) var(--space-4);
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.thinking__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-height: 4.5rem;
}
.thinking__title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}
.thinking__step {
  color: var(--color-primary-hover);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.thinking__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.thinking-step-enter-active,
.thinking-step-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.thinking-step-enter-from {
  opacity: 0;
  transform: translateY(0.375rem);
}
.thinking-step-leave-to {
  opacity: 0;
  transform: translateY(-0.375rem);
}
@media (prefers-reduced-motion: reduce) {
  .thinking-step-enter-active,
  .thinking-step-leave-active {
    transition: none;
  }
}
</style>
