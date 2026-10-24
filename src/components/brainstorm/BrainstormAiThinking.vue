<script setup>
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { Sparkles } from 'lucide-vue-next'

// Enquanto a IA gera a síntese: "constelação" de ideias orbitando, frases do que ela está fazendo,
// linhas sendo escritas e o tempo decorrido. Só visual: não muda nada da chamada.
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
const clock = computed(() => {
  const minutes = Math.floor(elapsed.value / 60)
  const seconds = String(elapsed.value % 60).padStart(2, '0')
  return minutes ? `${minutes}min ${seconds}s` : `${elapsed.value}s`
})
</script>

<template>
  <div class="thinking" role="status" aria-live="polite">
    <div class="thinking__orbit" aria-hidden="true">
      <span class="thinking__ring thinking__ring--outer">
        <span class="thinking__planet thinking__planet--a" />
        <span class="thinking__planet thinking__planet--b" />
      </span>
      <span class="thinking__ring thinking__ring--inner">
        <span class="thinking__planet thinking__planet--c" />
      </span>
      <span class="thinking__core">
        <Sparkles :size="22" />
      </span>
    </div>

    <div class="thinking__text">
      <p class="thinking__title">A IA está pensando</p>
      <Transition name="thinking-step" mode="out-in">
        <p :key="stepIndex" class="thinking__step">{{ STEPS[stepIndex] }}</p>
      </Transition>
      <p class="thinking__hint">
        <span class="visually-hidden">Tempo decorrido:</span>{{ clock }} · pode levar até 2 minutos
      </p>
    </div>

    <div class="thinking__draft" aria-hidden="true">
      <span class="thinking__line thinking__line--1" />
      <span class="thinking__line thinking__line--2" />
      <span class="thinking__line thinking__line--3" />
    </div>
  </div>
</template>

<style scoped>
.thinking {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}

/* Constelação: núcleo que respira + planetas em duas órbitas, em velocidades e sentidos diferentes. */
.thinking__orbit {
  position: relative;
  display: grid;
  place-items: center;
  width: 7.5rem;
  height: 7.5rem;
}
.thinking__ring {
  position: absolute;
  inset: 0;
  border: 1px dashed var(--color-border);
  border-radius: 50%;
  animation: thinking-spin 6s linear infinite;
}
.thinking__ring--inner {
  inset: 1.25rem;
  border-style: solid;
  animation-duration: 3.6s;
  animation-direction: reverse;
}
.thinking__planet {
  position: absolute;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: var(--color-primary);
}
.thinking__planet--a {
  top: -0.3125rem;
  left: calc(50% - 0.3125rem);
}
.thinking__planet--b {
  bottom: 0.75rem;
  left: 0.5rem;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--color-accent);
}
.thinking__planet--c {
  top: calc(50% - 0.25rem);
  right: -0.25rem;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--color-secondary);
}
.thinking__core {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  color: var(--color-on-primary);
  border-radius: 50%;
  background: var(--color-button-primary-bg);
  animation: thinking-breathe 2.4s ease-in-out infinite;
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

/* Rascunho sendo escrito: linhas que crescem e brilham de leve. */
.thinking__draft {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: min(26rem, 100%);
}
.thinking__line {
  height: 0.625rem;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--color-bg-subtle) 0%,
    var(--color-bg-hover) 50%,
    var(--color-bg-subtle) 100%
  );
  background-size: 200% 100%;
  animation:
    thinking-shimmer 1.6s ease-in-out infinite,
    thinking-write 3.2s ease-in-out infinite;
  transform-origin: left center;
}
.thinking__line--2 {
  width: 85%;
  animation-delay: 0.2s, 0.4s;
}
.thinking__line--3 {
  width: 60%;
  animation-delay: 0.4s, 0.8s;
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

@keyframes thinking-spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes thinking-breathe {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-primary) 30%, transparent);
  }
  50% {
    transform: scale(1.06);
    box-shadow: 0 0 0 0.625rem color-mix(in srgb, var(--color-primary) 0%, transparent);
  }
}
@keyframes thinking-shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}
@keyframes thinking-write {
  0% {
    transform: scaleX(0.15);
  }
  60%,
  100% {
    transform: scaleX(1);
  }
}

/* Quem prefere menos movimento vê o mesmo estado, parado. */
@media (prefers-reduced-motion: reduce) {
  .thinking__ring,
  .thinking__core,
  .thinking__line {
    animation: none;
  }
  .thinking-step-enter-active,
  .thinking-step-leave-active {
    transition: none;
  }
}
</style>
