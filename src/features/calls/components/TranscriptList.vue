<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ChatAvatar from '../../chat/components/ChatAvatar.vue'
import { formatOffset, groupTurns } from '../lib/transcript'

// Falas separadas por quem falou, em ordem. Acompanha o fim da lista, a menos que a pessoa tenha rolado para cima.
const props = defineProps({
  segments: { type: Array, default: () => [] },
  interim: { type: String, default: '' }, // o que a própria pessoa está falando agora (ainda não finalizado)
  emptyText: { type: String, default: 'Ainda não há falas transcritas.' },
  follow: Boolean,
})

const scroller = ref(null)
const turns = computed(() => groupTurns(props.segments))
let stuck = true

function onScroll() {
  const el = scroller.value

  stuck = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 48
}

async function toBottom() {
  if (!props.follow || !stuck) return

  await nextTick()

  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

watch(() => [props.segments.length, props.interim], toBottom)
onMounted(toBottom)
</script>

<template>
  <div ref="scroller" class="tlist" role="log" aria-live="polite" @scroll.passive="onScroll">
    <p v-if="!turns.length && !interim" class="tlist__empty">{{ emptyText }}</p>
    <article v-for="turn in turns" :key="turn.key" class="turn">
      <ChatAvatar :name="turn.name" :size="28" />
      <div class="turn__body">
        <header>
          <strong>{{ turn.name }}</strong>
          <time>{{ formatOffset(turn.offset_ms) }}</time>
        </header>
        <p>{{ turn.texts.join(' ') }}</p>
      </div>
    </article>
    <p v-if="interim" class="tlist__interim">{{ interim }}</p>
  </div>
</template>

<style scoped>
.tlist {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 0;
  padding: var(--space-3) var(--space-4);
  overflow-y: auto;
}

.tlist__empty {
  margin: auto;
  max-width: 18rem;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: center;
}

.turn {
  display: flex;
  gap: var(--space-3);
}

.turn__body {
  min-width: 0;
  flex: 1;
}

.turn__body header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}

.turn__body time {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
}

.turn__body p {
  margin-top: 0.125rem;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.tlist__interim {
  padding-left: calc(28px + var(--space-3));
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-style: italic;
  overflow-wrap: anywhere;
}
</style>
