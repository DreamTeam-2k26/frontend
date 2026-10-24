<script setup>
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'

// Tornado da IA: funil de anéis só com contorno (cores do tema) e ideias reais da discussão orbitando.
// Com `finishing`, as ideias descem em espiral para dentro do funil e o tornado se recolhe; ao fim, `done`.
// Só visual: quem decide quando terminar é o pai. Com "reduzir movimento", fica parado e termina na hora.
const { ideas = [], finishing = false } = defineProps({
  ideas: { type: Array, default: () => [] },
  finishing: { type: Boolean, default: false },
})

const emit = defineEmits({ done: null })

const RINGS = Array.from({ length: 9 }, (_, index) => ({
  key: index,
  cy: 30 + index * 17,
  rx: 84 - index * 9,
  ry: 12 - index * 1.1,
  tone: ['primary', 'secondary', 'accent'][index % 3],
}))
const TIP = { x: 120, y: 186 }
const PARTICLES = [0, 1, 2, 3, 4, 5]

const root = useTemplateRef('root')
let ctx = null
let orbits = []
let reduced = false
let finished = false
// Conversão das unidades do SVG (viewBox 240×210, centralizado) para pixels do contêiner das bolhas.
const geo = { k: 1, oy: 0 }

function measure() {
  const { clientWidth: width, clientHeight: height } = root.value
  geo.k = Math.min(width / 240, height / 210)
  geo.oy = (height - 210 * geo.k) / 2
}

// Cada ideia ganha uma órbita própria: altura, largura, velocidade e ponto de partida diferentes.
function orbitFor(index, total) {
  const level = total > 1 ? index / (total - 1) : 0.5
  return {
    angle: (360 / Math.max(total, 1)) * index,
    radius: 1,
    y: 40 + level * 110,
    rx: 104 - level * 44,
    ry: 16 - level * 6,
    speed: 7 + (index % 3) * 1.6,
  }
}

function place(chip, orbit) {
  const radians = (orbit.angle * Math.PI) / 180
  const depth = Math.sin(radians) // > 0: na frente do funil
  gsap.set(chip, {
    xPercent: -50,
    yPercent: -50,
    x: Math.cos(radians) * orbit.rx * orbit.radius * geo.k,
    y: geo.oy + (orbit.y + depth * orbit.ry * orbit.radius) * geo.k,
    scale: (0.82 + 0.18 * depth) * Math.max(orbit.radius, 0.15),
    opacity: (0.55 + 0.45 * depth) * Math.min(1, orbit.radius * 1.4),
    zIndex: depth > 0 ? 3 : 1,
  })
}

function startIdle() {
  const scope = root.value
  measure()
  const rings = scope.querySelectorAll('.tornado__ring')
  const chips = [...scope.querySelectorAll('.tornado__idea')]

  // Tracejado correndo (o funil "gira") e anéis balançando, mais rápido perto da ponta.
  rings.forEach((ring, index) => {
    gsap.to(ring, { strokeDashoffset: -96, duration: 2.4 - index * 0.22, ease: 'none', repeat: -1 })
    gsap.to(ring, {
      x: index % 2 ? 3 : -3,
      duration: 1.4 + index * 0.15,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
  })
  gsap.to(scope.querySelector('.tornado__funnel'), {
    rotation: 3,
    transformOrigin: '50% 0%',
    duration: 2.2,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  })

  // Poeira subindo do pé do tornado.
  scope.querySelectorAll('.tornado__particle').forEach((particle, index) => {
    gsap.fromTo(
      particle,
      { x: TIP.x + (index - 2.5) * 9, y: TIP.y + 6, opacity: 0, scale: 0.6 },
      {
        x: `+=${(index % 2 ? 1 : -1) * (12 + index * 3)}`,
        y: TIP.y - 40 - index * 6,
        opacity: 0.8,
        scale: 1,
        duration: 1.8 + index * 0.25,
        delay: index * 0.3,
        ease: 'power1.out',
        repeat: -1,
      },
    )
  })

  orbits = chips.map((chip, index) => {
    const orbit = orbitFor(index, chips.length)
    place(chip, orbit)
    const tween = gsap.to(orbit, {
      angle: `+=${360}`,
      duration: orbit.speed,
      ease: 'none',
      repeat: -1,
      onUpdate: () => place(chip, orbit),
    })
    return { chip, orbit, tween }
  })
}

// Final: ideias em espiral até a ponta, o funil acelera e se recolhe.
function absorb() {
  if (finished) return
  finished = true
  if (reduced || !root.value) {
    emit('done')
    return
  }
  ctx.add(() => {
    const scope = root.value
    const timeline = gsap.timeline({ onComplete: () => emit('done') })
    orbits.forEach(({ chip, orbit, tween }, index) => {
      tween.kill()
      timeline.to(
        orbit,
        {
          angle: `+=${540}`,
          radius: 0,
          y: TIP.y - 10,
          duration: 0.75,
          ease: 'power2.in',
          onUpdate: () => place(chip, orbit),
        },
        index * 0.05,
      )
    })
    timeline
      .to(
        scope.querySelectorAll('.tornado__ring'),
        { strokeDashoffset: '-=160', duration: 0.6, ease: 'power2.in' },
        0,
      )
      .to(
        scope.querySelector('.tornado__funnel'),
        {
          scaleY: 0.05,
          scaleX: 0.4,
          opacity: 0,
          transformOrigin: '50% 100%',
          duration: 0.35,
          ease: 'power3.in',
        },
        '>-0.1',
      )
  })
}

onMounted(() => {
  reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  ctx = gsap.context(() => {
    if (!reduced) startIdle()
  }, root.value)
  if (finishing) absorb()
})

watch(
  () => finishing,
  (value) => {
    if (value) absorb()
  },
)

// kill (e não revert): ao sair com transição, o tornado já recolhido não "volta" ao estado inicial.
onBeforeUnmount(() => ctx?.kill())
</script>

<template>
  <div ref="root" class="tornado" aria-hidden="true">
    <svg class="tornado__svg" viewBox="0 0 240 210" focusable="false">
      <g class="tornado__funnel">
        <ellipse
          v-for="ring in RINGS"
          :key="ring.key"
          class="tornado__ring"
          :class="`tornado__ring--${ring.tone}`"
          :cx="120"
          :cy="ring.cy"
          :rx="ring.rx"
          :ry="ring.ry"
        />
        <path
          class="tornado__tip"
          :d="`M ${TIP.x - 4} ${TIP.y - 14} Q ${TIP.x + 6} ${TIP.y - 4} ${TIP.x} ${TIP.y + 4}`"
        />
      </g>
      <circle v-for="particle in PARTICLES" :key="particle" class="tornado__particle" r="1.8" />
    </svg>
    <span v-for="(idea, index) in ideas" :key="`${index}-${idea}`" class="tornado__idea">{{
      idea
    }}</span>
  </div>
</template>

<style scoped>
.tornado {
  position: relative;
  width: min(22rem, 100%);
  height: 13.5rem;
  overflow: hidden;
}
.tornado__svg {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.tornado__ring {
  fill: none;
  stroke-width: 2.25;
  stroke-linecap: round;
  stroke-dasharray: 40 8;
}
.tornado__ring--primary {
  stroke: var(--color-primary);
}
.tornado__ring--secondary {
  stroke: var(--color-secondary);
}
.tornado__ring--accent {
  stroke: var(--color-accent);
}
.tornado__tip {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2;
  stroke-linecap: round;
}
.tornado__particle {
  fill: var(--color-accent);
  opacity: 0;
}
/* Bolha de ideia: posicionada pelo GSAP a partir do centro horizontal. */
.tornado__idea {
  position: absolute;
  top: 0;
  left: 50%;
  max-width: 11rem;
  padding: 0.25rem 0.625rem;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-card);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--color-text) 8%, transparent);
  will-change: transform, opacity;
}
/* Sem animação (reduzir movimento): ideias ficam numa faixa abaixo do funil, paradas. */
@media (prefers-reduced-motion: reduce) {
  .tornado {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-end;
    justify-content: center;
    gap: var(--space-1);
    height: auto;
    min-height: 13.5rem;
    padding-top: 10rem;
  }
  .tornado__idea {
    position: static;
  }
}
</style>
