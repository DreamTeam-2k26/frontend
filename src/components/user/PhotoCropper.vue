<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { X, RotateCcw, ZoomIn, ZoomOut } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { cropArea, moveCrop } from './photoCrop'
const props = defineProps({
  file: { type: File, required: true },
  initial: { type: Object, default: null },
})
const emit = defineEmits(['close', 'apply'])
const dialog = ref(null),
  surface = ref(null),
  titleId = useId(),
  hintId = useId(),
  zoomId = useId()
const width = ref(0),
  height = ref(0),
  zoom = ref(1),
  x = ref(0),
  y = ref(0)
const ready = ref(false),
  processing = ref(false),
  error = ref(''),
  dragging = ref(false)
const area = computed(() =>
  ready.value
    ? cropArea(width.value, height.value, { zoom: zoom.value, x: x.value, y: y.value })
    : null,
)
const imageStyle = computed(() =>
  area.value
    ? {
        width: `${(width.value / area.value.size) * 100}%`,
        height: `${(height.value / area.value.size) * 100}%`,
        left: `${(-area.value.x / area.value.size) * 100}%`,
        top: `${(-area.value.y / area.value.size) * 100}%`,
      }
    : {},
)
const source = URL.createObjectURL(props.file)
const image = new Image()
let previousFocus,
  active = true,
  pointer = null
function setArea(value) {
  zoom.value = value.zoom
  x.value = value.centerX
  y.value = value.centerY
}
function reset() {
  if (ready.value) setArea(cropArea(width.value, height.value))
}
function changeZoom(value) {
  if (!ready.value || processing.value) return
  setArea(cropArea(width.value, height.value, { zoom: Number(value), x: x.value, y: y.value }))
}
function startDrag(event) {
  if (!ready.value || processing.value || pointer || event.button !== 0) return
  surface.value.focus()
  surface.value.setPointerCapture(event.pointerId)
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, area: area.value }
  dragging.value = true
}
function drag(event) {
  if (!pointer || event.pointerId !== pointer.id) return
  setArea(
    moveCrop(
      width.value,
      height.value,
      { zoom: pointer.area.zoom, x: pointer.area.centerX, y: pointer.area.centerY },
      event.clientX - pointer.x,
      event.clientY - pointer.y,
      surface.value.clientWidth,
    ),
  )
}
function endDrag(event) {
  if (pointer?.id === event.pointerId) {
    pointer = null
    dragging.value = false
  }
}
function keyMove(event) {
  if (!ready.value || processing.value) return
  const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
    event.key
  ]
  if (!direction) return
  event.preventDefault()
  const step = surface.value.clientWidth * (event.shiftKey ? 0.1 : 0.025)
  setArea(
    moveCrop(
      width.value,
      height.value,
      { zoom: zoom.value, x: x.value, y: y.value },
      direction[0] * step,
      direction[1] * step,
      surface.value.clientWidth,
    ),
  )
}
async function apply() {
  if (!ready.value || processing.value) return
  processing.value = true
  error.value = ''
  const crop = area.value
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = Math.max(1, Math.min(512, Math.round(crop.size)))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas indisponível')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.size,
      crop.size,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    const type = props.file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.92))
    if (!blob) throw new Error('Não foi possível exportar a foto')
    if (!active) return
    const name = `${props.file.name.replace(/\.[^.]+$/, '') || 'foto-perfil'}.${type === 'image/png' ? 'png' : 'jpg'}`
    emit('apply', {
      file: new File([blob], name, { type }),
      crop: { zoom: crop.zoom, x: crop.centerX, y: crop.centerY },
    })
  } catch {
    if (active) error.value = 'Não foi possível preparar a foto. Tente outra imagem.'
  } finally {
    if (active) processing.value = false
  }
}
onMounted(() => {
  previousFocus = document.activeElement
  dialog.value.showModal()
  image.onload = () => {
    if (!active) return
    width.value = image.naturalWidth
    height.value = image.naturalHeight
    if (!width.value || !height.value) {
      error.value = 'A imagem não possui dimensões válidas.'
      return
    }
    ready.value = true
    setArea(cropArea(width.value, height.value, props.initial || undefined))
    nextTick(() => surface.value?.focus())
  }
  image.onerror = () => {
    if (active) error.value = 'Não foi possível abrir esta imagem. Escolha um PNG ou JPG válido.'
  }
  image.src = source
})
onBeforeUnmount(() => {
  active = false
  image.onload = null
  image.onerror = null
  URL.revokeObjectURL(source)
  dialog.value?.close()
  nextTick(() => {
    if (previousFocus?.isConnected) previousFocus.focus()
  })
})
</script>
<template>
  <dialog
    ref="dialog"
    class="photo-cropper"
    :aria-labelledby="titleId"
    :aria-busy="processing"
    @cancel.prevent="!processing && emit('close')"
  >
    <header>
      <h2 :id="titleId">Ajustar foto do perfil</h2>
      <button
        type="button"
        class="close"
        aria-label="Fechar ajuste de foto"
        :disabled="processing"
        @click="emit('close')"
      >
        <X :size="20" aria-hidden="true" />
      </button>
    </header>
    <p :id="hintId">
      Arraste a imagem para posicionar e use o zoom para aproximar. A área circular mostra como seu
      avatar ficará.
    </p>
    <p v-if="!ready && !error" role="status">Carregando imagem…</p>
    <div
      ref="surface"
      class="crop-surface"
      :class="{ dragging }"
      tabindex="0"
      role="group"
      aria-label="Posição da foto. Use as setas para mover a imagem."
      :aria-describedby="hintId"
      @pointerdown.prevent="startDrag"
      @pointermove="drag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @lostpointercapture="endDrag"
      @keydown="keyMove"
    >
      <img
        v-if="ready"
        :src="source"
        :style="imageStyle"
        alt="Prévia do enquadramento da foto"
        draggable="false"
      />
    </div>
    <div class="zoom-label">
      <label :for="zoomId">Zoom</label><output :for="zoomId">{{ Math.round(zoom * 100) }}%</output>
    </div>
    <div class="zoom-controls">
      <BaseButton
        variant="ghost"
        aria-label="Diminuir zoom"
        :disabled="!ready || processing || zoom <= 1"
        @click="changeZoom(zoom - 0.1)"
        ><ZoomOut :size="18" aria-hidden="true" /></BaseButton
      ><input
        :id="zoomId"
        type="range"
        min="1"
        max="4"
        step="0.01"
        :value="zoom"
        :disabled="!ready || processing"
        @input="changeZoom($event.target.value)"
      /><BaseButton
        variant="ghost"
        aria-label="Aumentar zoom"
        :disabled="!ready || processing || zoom >= 4"
        @click="changeZoom(zoom + 0.1)"
        ><ZoomIn :size="18" aria-hidden="true"
      /></BaseButton>
    </div>
    <p class="keyboard-hint">
      Também é possível mover com as setas do teclado. Shift + seta move mais rápido.
    </p>
    <BaseButton variant="ghost" :disabled="!ready || processing" @click="reset"
      ><RotateCcw :size="16" aria-hidden="true" />Centralizar e redefinir zoom</BaseButton
    >
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <footer>
      <BaseButton variant="secondary" :disabled="processing" @click="emit('close')"
        >Cancelar</BaseButton
      ><BaseButton :loading="processing" :disabled="!ready" @click="apply"
        >Usar esta foto</BaseButton
      >
    </footer>
    <p class="save-hint">Depois de ajustar, salve as alterações do perfil para aplicar a foto.</p>
  </dialog>
</template>
<style scoped>
.photo-cropper {
  margin: auto;
  width: min(30rem, calc(100% - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: var(--color-text);
  background: var(--color-bg-card);
}
.photo-cropper::backdrop {
  background: color-mix(in srgb, var(--color-text) 50%, transparent);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
h2 {
  font-size: var(--font-size-lg);
}
p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.close {
  display: grid;
  place-items: center;
  min-width: 2.75rem;
  min-height: 2.75rem;
}
.crop-surface {
  position: relative;
  width: min(100%, 17rem);
  aspect-ratio: 1;
  margin: var(--space-5) auto;
  overflow: hidden;
  border-radius: 50%;
  background: var(--color-bg-subtle);
  box-shadow: 0 0 0 2px var(--color-border);
  touch-action: none;
  cursor: grab;
  user-select: none;
}
.crop-surface.dragging {
  cursor: grabbing;
}
.crop-surface:focus-visible {
  outline: var(--focus-ring);
  outline-offset: 4px;
}
.crop-surface img {
  position: absolute;
  max-width: none;
  pointer-events: none;
  user-select: none;
}
.zoom-label {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}
.zoom-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
input[type='range'] {
  width: 100%;
  min-width: 0;
  min-height: 2.75rem;
  accent-color: var(--color-primary);
}
.keyboard-hint,
.save-hint {
  font-size: var(--font-size-xs);
  margin-block: var(--space-2);
}
footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.error {
  color: var(--color-danger);
}
@media (max-width: 420px) {
  .photo-cropper {
    padding: var(--space-4);
  }
  .crop-surface {
    width: min(100%, 14rem);
  }
}
</style>
