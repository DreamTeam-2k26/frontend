<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Folder, ChevronRight } from 'lucide-vue-next'
import folders from '@/api/folders'
import BaseButton from '@/components/ui/BaseButton.vue'
import FolderDialog from './FolderDialog.vue'
import { canMoveTo, sameFolder, folderError } from './folderState'
const props = defineProps({
  projectId: { type: [String, Number], required: true },
  folder: { type: Object, required: true },
  busy: Boolean,
  error: { type: String, default: '' },
})
const emit = defineEmits(['move', 'close', 'unavailable'])
const source = ref(props.folder)
const destination = ref(null)
const selectedId = ref(null)
const children = ref([])
const loading = ref(true)
const loadError = ref('')
let version = 0
let controller
const path = computed(() => destination.value?.path ?? [])
const unchanged = computed(() => sameFolder(source.value.parent, selectedId.value))
const allowed = computed(
  () =>
    !loading.value &&
    !loadError.value &&
    !unchanged.value &&
    canMoveTo(source.value, destination.value),
)
function childAllowed(folder) {
  return canMoveTo(source.value, { ...folder, path: [...path.value, { id: folder.id }] })
}
async function load(id = null) {
  if (props.busy) return
  const current = ++version
  controller?.abort()
  controller = new AbortController()
  const options = { signal: controller.signal }
  selectedId.value = id
  loading.value = true
  loadError.value = ''
  children.value = []
  destination.value = null
  try {
    const [freshSource, target, list] = await Promise.all([
      folders.detail(props.projectId, props.folder.id, options),
      id === null ? null : folders.detail(props.projectId, id, options),
      folders.list(props.projectId, id, options),
    ])
    if (current !== version) return
    if (!canMoveTo(freshSource, target)) {
      throw Object.assign(new Error('Destino indisponível'), {
        response: {
          status: 400,
          data: {
            parent: [
              'Essa pasta não pode ser usada como destino. Volte à raiz e escolha outro local.',
            ],
          },
        },
      })
    }
    source.value = freshSource
    destination.value = target
    children.value = list
  } catch (cause) {
    if (current === version) {
      loadError.value = folderError(cause)
      if ([403, 404].includes(cause.response?.status)) emit('unavailable')
    }
  } finally {
    if (current === version) loading.value = false
  }
}
onMounted(() => load())
onBeforeUnmount(() => {
  version++
  controller?.abort()
})
</script>

<template>
  <FolderDialog :title="`Mover ${folder.name}`" :busy="busy" @close="emit('close')">
    <p>
      Escolha o destino neste projeto. A própria pasta e suas subpastas não podem ser usadas como
      destino.
    </p>
    <nav class="destination-path" aria-label="Caminho do destino">
      <BaseButton
        variant="ghost"
        :disabled="busy"
        :aria-current="!selectedId ? 'location' : undefined"
        @click="load()"
        >Raiz</BaseButton
      >
      <template v-for="item in path" :key="item.id">
        <ChevronRight :size="14" aria-hidden="true" />
        <BaseButton
          variant="ghost"
          :disabled="busy"
          :aria-current="sameFolder(item.id, selectedId) ? 'location' : undefined"
          @click="load(item.id)"
          >{{ item.name }}</BaseButton
        >
      </template>
    </nav>
    <p v-if="loading" role="status">Carregando destinos…</p>
    <p v-if="loadError || error" class="operation-error" role="alert">{{ loadError || error }}</p>
    <BaseButton v-if="loadError" variant="secondary" :disabled="busy" @click="load(selectedId)"
      >Tentar novamente</BaseButton
    >
    <ul v-if="!loading && !loadError" class="destinations" aria-label="Pastas de destino">
      <li v-for="item in children" :key="item.id">
        <BaseButton
          variant="ghost"
          :disabled="busy || !childAllowed(item)"
          :aria-label="`Explorar destino ${item.name}${!childAllowed(item) ? ' (indisponível)' : ''}`"
          @click="load(item.id)"
        >
          <Folder :size="18" aria-hidden="true" /> {{ item.name }}
          <ChevronRight :size="14" aria-hidden="true" />
        </BaseButton>
      </li>
    </ul>
    <p v-if="!loading && !loadError && !children.length">Não há subpastas neste destino.</p>
    <p v-if="!loading && !loadError" class="destination-caption">
      Destino: <strong>{{ destination?.name || 'Raiz do projeto' }}</strong
      >{{ unchanged ? ' (local atual da pasta)' : '' }}
    </p>
    <div class="dialog-actions">
      <BaseButton variant="secondary" :disabled="busy" @click="emit('close')">Cancelar</BaseButton>
      <BaseButton
        :disabled="!allowed"
        :loading="busy"
        @click="allowed && !busy && emit('move', selectedId)"
        >{{ busy ? 'Movendo…' : 'Mover para este local' }}</BaseButton
      >
    </div>
  </FolderDialog>
</template>

<style scoped>
.destination-path {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-block: var(--space-3);
}
.destinations {
  max-height: 16rem;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.destinations :deep(.button) {
  width: 100%;
  justify-content: flex-start;
  text-align: left;
}
.destination-caption {
  margin-top: var(--space-4);
  color: var(--color-text-secondary);
}
</style>
