<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import folders from '@/api/folders'
import BaseButton from '@/components/ui/BaseButton.vue'
import FolderDialog from './FolderDialog.vue'
import { folderError } from './folderState'
const props = defineProps({
  projectId: { type: [String, Number], required: true },
  folder: { type: Object, required: true },
  busy: Boolean,
  error: { type: String, default: '' },
})
const emit = defineEmits(['confirm', 'close', 'unavailable'])
const detail = ref(null)
const loading = ref(true)
const loadError = ref('')
let controller
let version = 0
async function load() {
  const current = ++version
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  loadError.value = ''
  detail.value = null
  try {
    const data = await folders.detail(props.projectId, props.folder.id, {
      signal: controller.signal,
    })
    if (current === version) detail.value = data
  } catch (cause) {
    if (current === version) {
      loadError.value = folderError(cause)
      if ([403, 404].includes(cause.response?.status)) emit('unavailable')
    }
  } finally {
    if (current === version) loading.value = false
  }
}
onMounted(load)
onBeforeUnmount(() => {
  version++
  controller?.abort()
})
</script>

<template>
  <FolderDialog title="Excluir pasta" :busy="busy" @close="emit('close')">
    <p v-if="loading" role="status">Conferindo a pasta e suas subpastas…</p>
    <p v-if="loadError || error" class="operation-error" role="alert">{{ loadError || error }}</p>
    <template v-if="detail">
      <p>
        Excluir a pasta <strong>{{ detail.name }}</strong
        >?
      </p>
      <p class="delete-warning">
        Essa ação remove permanentemente a pasta, todas as subpastas descendentes e seus arquivos,
        inclusive do armazenamento. Não há lixeira ou opção de desfazer.
      </p>
      <p v-if="detail.children_count" class="delete-warning">
        <strong
          >Atenção: {{ detail.children_count }}
          {{
            detail.children_count === 1
              ? 'subpasta direta será removida'
              : 'subpastas diretas serão removidas'
          }}, incluindo todas as pastas dentro delas.</strong
        >
      </p>
    </template>
    <div class="dialog-actions">
      <BaseButton variant="secondary" autofocus :disabled="busy" @click="emit('close')"
        >Cancelar</BaseButton
      >
      <BaseButton v-if="loadError" variant="secondary" @click="load">Tentar novamente</BaseButton>
      <BaseButton
        :disabled="!detail || loading"
        :loading="busy"
        @click="!busy && emit('confirm')"
        >{{ busy ? 'Excluindo…' : 'Excluir permanentemente' }}</BaseButton
      >
    </div>
  </FolderDialog>
</template>

<style scoped>
.delete-warning {
  margin-top: var(--space-3);
  color: var(--color-danger);
}
</style>
