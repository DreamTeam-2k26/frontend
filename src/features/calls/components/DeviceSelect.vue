<script setup>
import { computed } from 'vue'
import { Mic, Video } from 'lucide-vue-next'
import BaseSelect from '@/components/ui/BaseSelect.vue'

// Escolha de microfone e câmera. `view` é o espelho reativo de useLocalMedia.
// Mesmo seletor do restante do app (Kanban, tarefas), em vez do <select> nativo.
const { view } = defineProps({
  view: { type: Object, required: true },
})
const emit = defineEmits(['select'])

function deviceOptions(devices, emptyLabel) {
  if (!devices.length) return [{ value: '', label: emptyLabel }]
  return [
    { value: '', label: 'Padrão do sistema' },
    ...devices.map((device) => ({ value: device.id, label: device.label })),
  ]
}

const micOptions = computed(() => deviceOptions(view.devices.mic, 'Nenhum microfone encontrado'))
const cameraOptions = computed(() =>
  deviceOptions(view.devices.camera, 'Nenhuma câmera encontrada'),
)
</script>

<template>
  <div class="devices">
    <BaseSelect
      :model-value="view.deviceIds.mic ?? ''"
      label="Microfone"
      :icon="Mic"
      :options="micOptions"
      :disabled="!view.devices.mic.length"
      @change="emit('select', 'mic', $event)"
    />
    <BaseSelect
      :model-value="view.deviceIds.camera ?? ''"
      label="Câmera"
      :icon="Video"
      :options="cameraOptions"
      :disabled="!view.devices.camera.length"
      @change="emit('select', 'camera', $event)"
    />
  </div>
</template>

<style scoped>
.devices {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
