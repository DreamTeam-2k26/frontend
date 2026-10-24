<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Mic, MicOff, Video, VideoOff } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { participantsText } from '../lib/callRules'
import { watchSpeaking } from '../lib/speaking'
import DeviceSelect from './DeviceSelect.vue'

// Tela antes de entrar: prévia da câmera, teste do microfone e escolha dos dispositivos.
const props = defineProps({
  call: { type: Object, required: true },
  view: { type: Object, required: true },
  busy: Boolean,
  media: { type: Object, required: true },
})
const emit = defineEmits(['join', 'cancel', 'mic', 'camera', 'select'])

const video = ref(null)
const hearing = ref(false)
const problems = computed(() => [props.view.errors.mic, props.view.errors.camera].filter(Boolean))
let stopWatch = () => {}

watch(
  () => props.view.previewStream,
  (stream) => {
    if (video.value) video.value.srcObject = stream
  },
  { flush: 'post' },
)
watch(video, (element) => {
  if (element) element.srcObject = props.view.previewStream
})

// Indicador de que o microfone está captando voz.
watch(
  () => [props.view.micOn, props.media.audioTrack],
  () => {
    stopWatch()
    hearing.value = false

    if (props.view.micOn && props.media.audioTrack) {
      stopWatch = watchSpeaking(new MediaStream([props.media.audioTrack]), (value) => {
        hearing.value = value
      })
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => stopWatch())
</script>

<template>
  <section class="prejoin" aria-labelledby="prejoin-title">
    <div class="prejoin__preview" :class="{ 'prejoin__preview--off': !view.previewStream }">
      <video v-show="view.previewStream" ref="video" autoplay playsinline muted />
      <p v-if="!view.previewStream">Câmera desligada</p>
      <div class="prejoin__toggles">
        <button
          type="button"
          class="prejoin__toggle"
          :class="{ 'prejoin__toggle--off': !view.micOn }"
          :aria-pressed="view.micOn"
          :aria-label="view.micOn ? 'Desativar microfone' : 'Ativar microfone'"
          @click="emit('mic')"
        >
          <component :is="view.micOn ? Mic : MicOff" :size="20" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="prejoin__toggle"
          :class="{ 'prejoin__toggle--off': !view.cameraOn }"
          :aria-pressed="view.cameraOn"
          :aria-label="view.cameraOn ? 'Desativar câmera' : 'Ativar câmera'"
          @click="emit('camera')"
        >
          <component :is="view.cameraOn ? Video : VideoOff" :size="20" aria-hidden="true" />
        </button>
      </div>
      <span v-if="view.micOn" class="prejoin__meter" :class="{ 'prejoin__meter--on': hearing }">
        {{ hearing ? 'Captando sua voz' : 'Fale algo para testar' }}
      </span>
    </div>

    <div class="prejoin__side">
      <h1 id="prejoin-title">{{ call.title }}</h1>
      <p class="prejoin__project">
        {{ call.project_name }} · {{ participantsText(call.participants_count) }}
      </p>

      <DeviceSelect
        :view="view"
        id-prefix="prejoin"
        @select="(kind, id) => emit('select', kind, id)"
      />

      <ul v-if="problems.length" class="prejoin__problems" role="alert">
        <li v-for="problem in problems" :key="problem">{{ problem }}</li>
      </ul>
      <p v-if="problems.length" class="prejoin__hint">
        Você ainda pode entrar sem câmera ou microfone e ativar depois.
      </p>

      <div class="prejoin__actions">
        <BaseButton variant="secondary" :disabled="busy" @click="emit('cancel')"
          >Cancelar</BaseButton
        >
        <BaseButton :loading="busy" @click="emit('join')">Participar agora</BaseButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.prejoin {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(16rem, 1fr);
  align-items: center;
  gap: var(--space-8);
  width: min(62rem, 100%);
  margin: 0 auto;
  padding: var(--space-6);
}

.prejoin__preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  color: #fff;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-text) 88%, var(--color-bg-card));
}

.prejoin__preview video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.prejoin__toggles {
  position: absolute;
  bottom: var(--space-3);
  left: 50%;
  display: flex;
  gap: var(--space-3);
  transform: translateX(-50%);
}

.prejoin__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  color: #fff;
  border: 1px solid rgb(255 255 255 / 45%);
  border-radius: 50%;
  background: rgb(0 0 0 / 45%);
}

.prejoin__toggle--off {
  border-color: var(--color-danger);
  background: var(--color-danger);
}

.prejoin__meter {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  padding: 0.125rem var(--space-2);
  font-size: var(--font-size-xs);
  border-radius: var(--radius-full);
  background: rgb(0 0 0 / 55%);
}

.prejoin__meter--on {
  background: var(--color-success);
}

.prejoin__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

h1 {
  font-size: var(--font-size-xl);
  overflow-wrap: anywhere;
}

.prejoin__project,
.prejoin__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.prejoin__problems {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-md);
  background: var(--color-danger-soft);
}

.prejoin__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
}

@media (max-width: 800px) {
  .prejoin {
    grid-template-columns: 1fr;
    gap: var(--space-5);
    padding: var(--space-4);
  }
}
</style>
