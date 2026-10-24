<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { MessagesSquare } from 'lucide-vue-next'
import ChatPane from '@/features/chat/components/ChatPane.vue'
import { useChatStore } from '@/features/chat/stores/chat'

// Conversa do projeto: a sala é a que está ligada a este projeto (room.project).
const props = defineProps({ projectId: { type: Number, required: true } })

const chat = useChatStore()
const room = computed(() => chat.rooms.find((item) => item.project === props.projectId) ?? null)
const waiting = computed(() => !chat.roomsLoaded || chat.loadingRooms)

watch(
  () => room.value?.id ?? null,
  (id) => {
    if (id) chat.openRoom(id)
    else chat.closeRoom()
  },
  { immediate: true },
)

onBeforeUnmount(() => chat.closeRoom())
</script>

<template>
  <section class="project-chat" aria-label="Conversa do projeto">
    <ChatPane
      v-if="room && chat.activeRoom?.id === room.id"
      in-project
      class="project-chat__pane"
    />
    <div v-else class="project-chat__state" role="status">
      <MessagesSquare :size="40" aria-hidden="true" />
      <p v-if="waiting || room">Abrindo conversa…</p>
      <template v-else>
        <p>A conversa deste projeto não está disponível agora.</p>
        <button type="button" class="project-chat__retry" @click="chat.loadRooms()">
          Tentar novamente
        </button>
      </template>
    </div>
    <RouterLink
      v-if="room"
      class="project-chat__all"
      :to="{ name: 'chat', params: { roomId: room.id } }"
      >Abrir na página de salas</RouterLink
    >
  </section>
</template>

<style scoped>
.project-chat {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
}
/* Ocupa a altura que a aba reserva (ProjectDetailView); quem rola é a lista de mensagens. */
.project-chat__pane,
.project-chat__state {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.project-chat__pane :deep(.window__back) {
  display: none; /* a conversa já é a do projeto: não há lista de salas para onde voltar */
}
.project-chat__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: var(--color-text-secondary);
  background: var(--color-bg-card);
}
.project-chat__retry {
  color: var(--color-primary-hover);
  text-decoration: underline;
}
.project-chat__all {
  align-self: flex-end;
  color: var(--color-primary-hover);
  font-size: var(--font-size-sm);
}
</style>
