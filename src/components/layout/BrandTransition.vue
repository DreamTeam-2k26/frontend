<script setup>
import { nextTick, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { animate } from 'motion-v'
import { useAppTransition } from '@/composables/useAppTransition'
import { EASE } from '@/utils/motion'

// Camada de marca do Fluxo: o símbolo se desenha (curvas do infinito até a seta) e a tela abre
// a partir do centro. Quem decide quando tocar cada etapa é o coordenador (useAppTransition).
const { visible, attach } = useAppTransition()

const root = useTemplateRef('root')
const symbol = useTemplateRef('symbol')
const strokeA = useTemplateRef('strokeA')
const strokeB = useTemplateRef('strokeB')
const accents = useTemplateRef('accents')
const arrow = useTemplateRef('arrow')

// Raio do recorte que abre a tela, em vmax: 0 cobre tudo, 75 já passa dos cantos.
const OPEN = 75
let running = []
let lastIntro = 'full'

function track(...animations) {
  running.push(...animations)
  return Promise.all(animations)
}

function stopAll() {
  running.forEach((animation) => animation.stop())
  running = []
}

function setHole(value) {
  root.value?.style.setProperty('--brand-hole', `${value}vmax`)
}

function hole(from, to, options) {
  return animate(from, to, { ...options, onUpdate: setHole })
}

// Símbolo inteiro, já desenhado: usado na versão curta, na entrada e no logout.
function drawn() {
  strokeA.value.style.strokeDashoffset = '0'
  strokeB.value.style.strokeDashoffset = '0'
  accents.value.style.opacity = '1'
  arrow.value.style.opacity = '1'
  arrow.value.style.transform = 'none'
}

async function intro(variant) {
  await nextTick()
  stopAll()
  lastIntro = variant
  setHole(0)
  if (variant === 'short') {
    drawn()
    symbol.value.style.opacity = '1'
    return
  }
  await track(
    animate(
      symbol.value,
      { opacity: [0, 1], scale: [0.96, 1] },
      { duration: 0.16, ease: EASE.flow },
    ),
    // A máscara percorre a linha central de cada curva escura (pathLength = 1).
    animate(
      strokeA.value,
      { strokeDashoffset: [1, 0] },
      { duration: 0.46, delay: 0.16, ease: EASE.inOut },
    ),
    animate(
      strokeB.value,
      { strokeDashoffset: [1, 0] },
      { duration: 0.38, delay: 0.34, ease: EASE.inOut },
    ),
    animate(accents.value, { opacity: [0, 1] }, { duration: 0.3, delay: 0.4, ease: 'easeOut' }),
    animate(
      arrow.value,
      { opacity: [0, 1], x: [-40, 0] },
      { duration: 0.24, delay: 0.62, ease: EASE.flow },
    ),
  )
  // Respiro curto com o símbolo completo antes de abrir.
  await track(animate(0, 1, { duration: 0.1 }))
}

async function cover() {
  await nextTick()
  stopAll()
  // Entrada e logout sempre abrem pelo recorte, mesmo depois de uma abertura curta.
  lastIntro = 'full'
  drawn()
  setHole(OPEN)
  await track(
    hole(OPEN, 0, { duration: 0.2, ease: EASE.exit }),
    animate(
      symbol.value,
      { opacity: [0, 1], scale: [0.9, 1] },
      { duration: 0.2, delay: 0.04, ease: EASE.flow },
    ),
  )
}

async function reveal() {
  stopAll()
  if (lastIntro === 'short') {
    lastIntro = 'full'
    await track(animate(root.value, { opacity: [1, 0] }, { duration: 0.2, ease: 'easeOut' }))
    root.value.style.opacity = ''
    return
  }
  await track(
    hole(0, OPEN, { duration: 0.34, ease: EASE.inOut }),
    animate(
      symbol.value,
      { opacity: [1, 0], scale: [1, 1.5] },
      { duration: 0.28, ease: EASE.inOut },
    ),
  )
}

let detach
onMounted(() => {
  detach = attach({ intro, cover, reveal })
})
onBeforeUnmount(() => {
  detach?.()
  stopAll()
})
</script>

<template>
  <div v-show="visible" ref="root" class="brand-transition" aria-hidden="true">
    <div class="brand-transition__surface" />
    <svg
      ref="symbol"
      class="brand-transition__symbol"
      viewBox="160 390 980 470"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Traço grosso pela linha central de cada curva: revela a forma preenchida aos poucos. -->
        <mask id="brand-draw-a" maskUnits="userSpaceOnUse" x="160" y="390" width="980" height="470">
          <path
            ref="strokeA"
            class="brand-transition__stroke"
            pathLength="1"
            d="M190 610C190 520 250 453 330 453C390 453 420 470 447 504L648 728C690 775 740 798 790 798C860 798 920 760 958 680"
          />
        </mask>
        <mask id="brand-draw-b" maskUnits="userSpaceOnUse" x="160" y="390" width="980" height="470">
          <path
            ref="strokeB"
            class="brand-transition__stroke"
            pathLength="1"
            d="M620 600L707 508C740 476 780 460 820 460C890 460 950 510 975 590"
          />
        </mask>
      </defs>
      <g ref="accents" class="brand-transition__accent">
        <path
          d="M196 781V731c0-79 62-141 143-141h77c57 0 57 91 0 91h-70c-29 0-53 23-53 52v48c0 25-15 41-40 41h-18c-24 0-39-16-39-41Z"
        />
        <path d="m365 788 137-146 65 75-82 83c-15 15-32 22-53 22h-49c-23 0-32-17-18-34Z" />
      </g>
      <path
        ref="arrow"
        class="brand-transition__accent brand-transition__arrow"
        d="M1024 594v-39c0-16 15-22 26-11l67 68c7 8 7 18 0 26l-68 70c-11 11-25 5-25-10v-38h-80c-46 0-46-66 0-66Z"
      />
      <path
        class="brand-transition__main"
        mask="url(#brand-draw-a)"
        d="M176 599v-43c0-85 68-151 150-151 73 0 118 15 164 67l197 226c32 37 63 51 101 51 51 0 96-26 118-73 3-6 7-7 13-5 20 8 52 3 79 3 9 0 12 4 9 13-28 94-109 157-212 157-76 0-136-32-187-90L405 536c-19-22-42-34-68-34-36 0-63 23-88 51l-48 54c-11 14-25 9-25-8Z"
      />
      <path
        class="brand-transition__main"
        mask="url(#brand-draw-b)"
        d="m604 560 78-88c38-37 83-55 138-55 96 0 178 60 184 150 1 7-3 11-10 11h-69c-7 0-10-1-11-8-7-41-44-68-93-68-34 0-62 14-88 43l-71 78c-4 5-8 5-12 0l-47-51c-3-4-3-8 1-12Z"
      />
    </svg>
  </div>
</template>

<style scoped>
.brand-transition {
  --brand-hole: 0vmax;

  position: fixed;
  inset: 0;
  z-index: var(--z-brand);
  display: grid;
  place-items: center;
  pointer-events: auto;
}

/* Fundo do tema com um recorte circular que cresce do centro e revela a tela de destino. */
.brand-transition__surface {
  position: absolute;
  inset: 0;
  background: var(--color-bg-page);
  mask-image: radial-gradient(
    circle at 50% 50%,
    transparent var(--brand-hole),
    black calc(var(--brand-hole) + 1px)
  );
}

.brand-transition__symbol {
  position: relative;
  width: min(16rem, 56vw);
  height: auto;
  overflow: visible;
  /* Estado inicial da abertura completa: nada desenhado até a primeira etapa. */
  opacity: 0;
}

.brand-transition__stroke {
  fill: none;
  stroke: white;
  stroke-width: 140;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

/* Logo monocromática no tom do tema (contexto: claro #26362E, escuro #EDF3ED). */
.brand-transition__main {
  fill: var(--color-logo);
}

.brand-transition__accent {
  fill: color-mix(in srgb, var(--color-logo) 45%, var(--color-bg-page));
  opacity: 0;
}

.brand-transition__arrow {
  transform-box: fill-box;
}
</style>
