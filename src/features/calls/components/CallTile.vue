<script setup>
import { computed, ref, watch } from 'vue'
import { Hand, MicOff, MonitorUp } from 'lucide-vue-next'
import ChatAvatar from '../../chat/components/ChatAvatar.vue'

// Quadro de uma pessoa (câmera) ou de uma tela compartilhada. O <video> fica sempre montado:
// mesmo com a câmera apagada ele toca o áudio do participante.
const props = defineProps({
  name: { type: String, required: true },
  avatar: { type: String, default: null },
  stream: { type: Object, default: null },
  rev: { type: Number, default: 0 },
  videoOn: Boolean,
  muted: Boolean, // não toca o áudio (o próprio usuário e as telas)
  micOff: Boolean,
  hand: Boolean,
  speaking: Boolean,
  mirrored: Boolean,
  screen: Boolean,
  self: Boolean,
  status: { type: String, default: 'connected' },
})

const video = ref(null)
const showVideo = computed(() => !!props.stream && props.videoOn)

function attach() {
  const element = video.value

  if (!element) return

  if (element.srcObject !== props.stream) element.srcObject = props.stream

  if (props.stream) element.play?.().catch(() => {})
}

watch(() => [props.stream, props.rev], attach, { flush: 'post' })
watch(video, attach, { flush: 'post' })
</script>

<template>
  <div
    class="tile"
    :class="{
      'tile--speaking': speaking && !screen,
      'tile--screen': screen,
      'tile--off': !showVideo,
    }"
  >
    <video
      v-show="showVideo"
      ref="video"
      class="tile__video"
      :class="{ 'tile__video--mirror': mirrored, 'tile__video--contain': screen }"
      autoplay
      playsinline
      :muted="muted"
    />
    <div v-if="!showVideo" class="tile__avatar">
      <ChatAvatar :name="name" :src="avatar" :size="72" />
    </div>

    <div v-if="hand" class="tile__hand" title="Mão levantada">
      <Hand :size="18" aria-hidden="true" />
    </div>
    <div v-if="status === 'connecting' && !self" class="tile__status" role="status">
      Conectando…
    </div>

    <div class="tile__name">
      <MonitorUp v-if="screen" :size="14" aria-hidden="true" />
      <MicOff v-else-if="micOff" :size="14" aria-hidden="true" class="tile__muted" />
      <span>{{ screen ? `Tela de ${name}` : self ? `${name} (você)` : name }}</span>
    </div>
  </div>
</template>

<style scoped>
.tile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-text) 88%, var(--color-bg-card));
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.tile--speaking {
  border-color: var(--color-success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success) 30%, transparent);
}

.tile__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tile__video--contain {
  object-fit: contain;
  background: #000;
}

.tile__video--mirror {
  transform: scaleX(-1);
}

.tile__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile__name {
  position: absolute;
  bottom: var(--space-2);
  left: var(--space-2);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  max-width: calc(100% - var(--space-4));
  padding: 0.125rem var(--space-2);
  color: #fff;
  font-size: var(--font-size-xs);
  border-radius: var(--radius-full);
  background: rgb(0 0 0 / 55%);
}

.tile__name span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tile__muted {
  color: #ffb4b4;
}

.tile__hand {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: inline-flex;
  padding: var(--space-2);
  color: #3a2a00;
  border-radius: 50%;
  background: #f5c542;
  animation: tile-hand 1.2s ease-in-out infinite;
}

.tile__status {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  padding: 0.125rem var(--space-2);
  color: #fff;
  font-size: var(--font-size-xs);
  border-radius: var(--radius-full);
  background: rgb(0 0 0 / 55%);
}

@keyframes tile-hand {
  50% {
    transform: translateY(-3px) rotate(-8deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile__hand {
    animation: none;
  }
}
</style>
