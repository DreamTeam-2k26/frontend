<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import ChatPane from '../../chat/components/ChatPane.vue'
import { useChatStore } from '../../chat/stores/chat'

// Conversa do projeto dentro da chamada: é a mesma sala de chat do projeto (as mensagens ficam salvas lá).
const props = defineProps({ projectId: { type: Number, required: true } })

const chat = useChatStore()
const room = computed(() => chat.rooms.find((item) => item.project === props.projectId) ?? null)

watch(
  () => room.value?.id ?? null,
  (id) => {
    if (id) chat.openRoom(id)
  },
  { immediate: true },
)
onBeforeUnmount(() => chat.closeRoom())
</script>

<template>
  <div class="call-chat">
    <ChatPane v-if="room && chat.activeRoom?.id === room.id" in-project class="call-chat__pane" />
    <p v-else class="call-chat__state" role="status">Abrindo a conversa…</p>
  </div>
</template>

<style scoped>
.call-chat {
  display: flex;
  flex: 1;
  min-height: 0;
}

.call-chat__pane {
  flex: 1;
  min-width: 0;
}

/* Aqui não há lista de salas para onde voltar. */
.call-chat__pane :deep(.window__back) {
  display: none;
}

.call-chat__state {
  margin: auto;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
