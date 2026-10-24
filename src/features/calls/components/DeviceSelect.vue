<script setup>
// Escolha de microfone e câmera. `view` é o espelho reativo de useLocalMedia.
defineProps({
  view: { type: Object, required: true },
  idPrefix: { type: String, default: 'device' },
})
defineEmits(['select'])
</script>

<template>
  <div class="devices">
    <label :for="`${idPrefix}-mic`">Microfone</label>
    <select
      :id="`${idPrefix}-mic`"
      :value="view.deviceIds.mic"
      :disabled="!view.devices.mic.length"
      @change="$emit('select', 'mic', $event.target.value)"
    >
      <option v-if="!view.devices.mic.length" value="">Nenhum microfone encontrado</option>
      <option v-else value="">Padrão do sistema</option>
      <option v-for="device in view.devices.mic" :key="device.id" :value="device.id">
        {{ device.label }}
      </option>
    </select>

    <label :for="`${idPrefix}-camera`">Câmera</label>
    <select
      :id="`${idPrefix}-camera`"
      :value="view.deviceIds.camera"
      :disabled="!view.devices.camera.length"
      @change="$emit('select', 'camera', $event.target.value)"
    >
      <option v-if="!view.devices.camera.length" value="">Nenhuma câmera encontrada</option>
      <option v-else value="">Padrão do sistema</option>
      <option v-for="device in view.devices.camera" :key="device.id" :value="device.id">
        {{ device.label }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.devices {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

select {
  width: 100%;
  min-height: 2.75rem;
  padding: var(--space-2) var(--space-3);
}
</style>
