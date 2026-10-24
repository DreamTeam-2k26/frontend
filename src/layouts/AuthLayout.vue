<script setup>
import AppBrand from '@/components/layout/AppBrand.vue'
import { appConfig } from '@/config/app'
import { useAppTransition } from '@/composables/useAppTransition'

// A ilustração só começa a se desenhar quando a abertura revela a tela.
const { contentReady } = useAppTransition()

const year = new Date().getFullYear()

// Os três estados do Kanban, na ordem em que uma tarefa percorre o fluxo.
const stages = [
  { label: 'A fazer', x: 40 },
  { label: 'Em andamento', x: 180 },
  { label: 'Concluído', x: 320 },
]
</script>

<template>
  <div class="auth-layout" :class="{ 'auth-layout--ready': contentReady }">
    <aside class="auth-layout__panel">
      <AppBrand class="auth-layout__brand" />

      <div class="auth-layout__pitch">
        <figure class="flow" aria-hidden="true">
          <svg class="flow__line" viewBox="0 0 360 120" fill="none">
            <path
              class="flow__path"
              pathLength="1"
              d="M40 60C90 10 130 10 180 60S270 110 320 60L346 60M338 52l8 8-8 8"
            />
            <circle
              v-for="(stage, index) in stages"
              :key="stage.label"
              class="flow__node"
              :class="`flow__node--${index}`"
              :cx="stage.x"
              cy="60"
              r="7"
            />
          </svg>
          <figcaption class="flow__labels">
            <span
              v-for="stage in stages"
              :key="stage.label"
              class="flow__label"
              :style="{ left: `${(stage.x / 360) * 100}%` }"
            >
              {{ stage.label }}
            </span>
          </figcaption>
        </figure>

        <p class="auth-layout__headline">Trabalhe melhor.<br />Em conjunto.</p>
        <p class="auth-layout__lead">
          Projetos, tarefas e conversas organizados em um só lugar. Sem complicação.
        </p>
      </div>

      <p class="auth-layout__footer">
        © {{ year }} {{ appConfig.name }}. Feito para equipes que constroem.
      </p>
    </aside>

    <main class="auth-layout__content">
      <!-- Login ↔ cadastro: só o cartão troca; a entrada dele fica com o AuthCard. -->
      <RouterView v-slot="{ Component, route: current }">
        <Transition name="auth-swap" mode="out-in">
          <component :is="Component" :key="current.name" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.auth-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: 100vh;
  min-height: 100dvh;
  background-color: var(--color-bg-card);
}

/* Painel da marca */
.auth-layout__panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-10);
  padding: var(--space-10) clamp(var(--space-6), 6vw, 4.5rem);
  background-color: var(--color-bg-subtle);
  border-right: 1px solid var(--color-border);
}

.auth-layout__brand {
  align-self: flex-start;
}

/* Logo maior aqui: no painel ela divide espaço só com o título. */
.auth-layout__brand :deep(.brand__logo) {
  max-width: 10rem;
  height: 2.75rem;
}

.auth-layout__pitch {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: 26rem;
}

.auth-layout__headline {
  color: var(--color-text);
  font-size: clamp(2rem, 3.4vw, 2.75rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.08;
  letter-spacing: -0.03em;
}

.auth-layout__lead {
  max-width: 22rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  line-height: var(--line-height-base);
}

.auth-layout__footer {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

/* Fluxo A fazer → Em andamento → Concluído, ecoando a seta da logo. */
.flow {
  position: relative;
  width: 100%;
  max-width: 22rem;
  margin: 0 0 var(--space-6);
}

.flow__line {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.flow__path {
  stroke: var(--color-secondary);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  animation: flow-draw 1.4s cubic-bezier(0.65, 0, 0.35, 1) both;
}

.flow__node {
  stroke-width: 2.5;
  animation: flow-node 0.3s ease-out both;
}

.flow__node--0 {
  fill: var(--color-bg-subtle);
  stroke: var(--color-status-todo);
}

.flow__node--1 {
  fill: var(--color-bg-subtle);
  stroke: var(--color-status-doing);
  animation-delay: 0.6s;
}

.flow__node--2 {
  fill: var(--color-status-done);
  stroke: var(--color-status-done);
  animation-delay: 1.15s;
}

.flow__labels {
  position: relative;
  height: var(--space-5);
  margin-top: var(--space-1);
}

.flow__label {
  position: absolute;
  top: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  transform: translateX(-50%);
}

@keyframes flow-draw {
  from {
    stroke-dashoffset: 1;
  }
}

@keyframes flow-node {
  from {
    opacity: 0;
  }
}

/* Pausada (no primeiro quadro, ainda invisível) enquanto a camada de marca cobre a tela. */
.auth-layout:not(.auth-layout--ready) .flow__path,
.auth-layout:not(.auth-layout--ready) .flow__node {
  animation-play-state: paused;
}

.auth-swap-leave-active {
  transition:
    opacity var(--motion-quick) var(--ease-flow-exit),
    transform var(--motion-quick) var(--ease-flow-exit);
}

.auth-swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .flow__path,
  .flow__node {
    animation: none;
  }
}

/* Formulário */
.auth-layout__content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  /* Padding vertical acompanha a altura da tela para o cadastro caber sem rolagem. */
  padding: clamp(var(--space-4), 3vh, var(--space-10)) var(--space-6);
}

/* Tablet e celular: o painel vira só a faixa da marca. */
@media (max-width: 899px) {
  .auth-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto 1fr;
  }

  .auth-layout__panel {
    padding: var(--space-5) var(--space-6);
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .auth-layout__pitch,
  .auth-layout__footer {
    display: none;
  }

  .auth-layout__content {
    align-items: flex-start;
    padding: var(--space-8) var(--space-5) var(--space-10);
  }
}
</style>
