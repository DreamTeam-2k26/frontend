<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronRight, Folder } from 'lucide-vue-next'
import folders from '@/api/folders'
import BaseButton from '@/components/ui/BaseButton.vue'
import FolderDialog from '@/components/folders/FolderDialog.vue'
import { folderError, sameFolder } from '@/components/folders/folderState'
const props = defineProps({
  projectId: { type: [String, Number], required: true },
  initial: { type: [String, Number], default: null },
})
const emit = defineEmits(['select', 'close'])
const selected = ref(null),
  destination = ref(null),
  children = ref([]),
  loading = ref(true),
  error = ref('')
const path = computed(() => destination.value?.path || [])
let generation = 0,
  controller
async function load(id = null) {
  const current = ++generation
  controller?.abort()
  controller = new AbortController()
  selected.value = id
  loading.value = true
  error.value = ''
  children.value = []
  destination.value = null
  try {
    const options = { signal: controller.signal }
    const [target, list] = await Promise.all([
      id === null ? null : folders.detail(props.projectId, id, options),
      folders.list(props.projectId, id, options),
    ])
    if (current === generation) {
      destination.value = target
      children.value = list
    }
  } catch (cause) {
    if (current === generation) error.value = folderError(cause)
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(
  () => [props.projectId, props.initial],
  () => load(props.initial),
  { immediate: true },
)
onBeforeUnmount(() => {
  generation++
  controller?.abort()
})
</script>
<template>
  <FolderDialog title="Escolher pasta de destino" @close="emit('close')">
    <p>Escolha uma pasta deste projeto ou a raiz.</p>
    <nav class="destination-path" aria-label="Caminho do destino">
      <BaseButton
        variant="ghost"
        :aria-current="selected === null ? 'location' : undefined"
        @click="load()"
        >Raiz</BaseButton
      ><template v-for="item in path" :key="item.id"
        ><ChevronRight :size="14" aria-hidden="true" /><BaseButton
          variant="ghost"
          :aria-current="sameFolder(selected, item.id) ? 'location' : undefined"
          @click="load(item.id)"
          >{{ item.name }}</BaseButton
        ></template
      >
    </nav>
    <p v-if="loading" role="status">Carregando destinos…</p>
    <p v-if="error" role="alert" class="operation-error">{{ error }}</p>
    <BaseButton v-if="error" variant="secondary" @click="load(selected)"
      >Tentar novamente</BaseButton
    >
    <ul v-if="!loading && !error" class="destinations">
      <li v-for="item in children" :key="item.id">
        <BaseButton
          variant="ghost"
          :aria-label="`Explorar destino ${item.name}`"
          @click="load(item.id)"
          ><Folder :size="18" aria-hidden="true" />{{ item.name
          }}<ChevronRight :size="14" aria-hidden="true"
        /></BaseButton>
      </li>
    </ul>
    <p v-if="!loading && !error && !children.length">Não há subpastas neste destino.</p>
    <p class="caption">
      Destino: <strong>{{ destination?.name || 'Raiz do projeto' }}</strong>
    </p>
    <div class="dialog-actions">
      <BaseButton variant="secondary" @click="emit('close')">Cancelar</BaseButton
      ><BaseButton
        :disabled="loading || !!error"
        @click="emit('select', { id: selected, name: destination?.name || 'Raiz do projeto' })"
        >Usar este local</BaseButton
      >
    </div>
  </FolderDialog>
</template>
<style scoped>
.destination-path {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
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
  justify-content: start;
}
.caption {
  margin-top: var(--space-4);
}
</style>
