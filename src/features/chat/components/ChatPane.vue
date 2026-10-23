<script setup>
import { computed, ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import ChatWindow from './ChatWindow.vue'
import RoomInfoPanel from './RoomInfoPanel.vue'

// Conversa de uma sala já aberta no store (chat.openRoom) com o painel de detalhes opcional.
// Usada tanto na página de salas quanto na aba "Conversa" do projeto.
const { inProject = false } = defineProps({ inProject: { type: Boolean, default: false } })

const emit = defineEmits(['back'])

const chat = useChatStore()

const maxFileMb = Number(import.meta.env.VITE_CHAT_MAX_UPLOAD_MB) || 10

const infoOpen = ref(false)
const room = computed(() => chat.activeRoom)
const detail = computed(() => (room.value ? chat.details[room.value.id] : null))

watch(
  () => room.value?.id,
  () => {
    infoOpen.value = false
  },
)

watch(infoOpen, (open) => {
  if (open && room.value) chat.loadDetail(room.value.id)
})
</script>

<template>
  <div v-if="room" class="pane" :class="{ 'pane--info': infoOpen }">
    <ChatWindow
      class="pane__window"
      :room="room"
      :messages="chat.activeMessages"
      :members="detail?.members ?? []"
      :presence="chat.presence"
      :me-id="chat.me?.id ?? null"
      :loading="chat.loadingHistory"
      :loading-older="chat.loadingHistory"
      :error="chat.historyError"
      :typing="chat.typingNow"
      :max-file-mb="maxFileMb"
      @back="emit('back')"
      @info="infoOpen = !infoOpen"
      @load-older="chat.loadOlder()"
      @send="chat.sendText($event.body, $event.replyTo)"
      @send-file="chat.sendFile($event.file, $event.replyTo)"
      @edit="chat.editMessage($event.id, $event.body)"
      @delete="chat.deleteMessage($event)"
      @typing="chat.notifyTyping()"
    />

    <RoomInfoPanel
      v-if="infoOpen"
      class="pane__info"
      :room="room"
      :detail="detail"
      :me-id="chat.me?.id ?? null"
      :presence="chat.presence"
      :in-project="inProject"
      @close="infoOpen = false"
    />
  </div>
</template>

<style scoped>
/* Mesmas cores da página de salas (claro: branco; escuro: fundo da página, mensagens um degrau abaixo). */
.pane {
  --chat-bg: var(--color-background);
  --chat-deep: var(--chat-bg);
}

:global(:root[data-theme='dark']) .pane {
  --chat-bg: var(--color-bg-page, var(--color-surface));
  --chat-deep: color-mix(in srgb, var(--chat-bg) 80%, #000000);
}

.pane {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
}

.pane--info {
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 20rem);
}

.pane__info {
  border-left: 1px solid var(--color-border);
}

@media (prefers-reduced-motion: no-preference) {
  .pane__info {
    animation: info-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
}

@keyframes info-in {
  from {
    opacity: 0;
    transform: translateX(1.5rem);
  }
}

/* Celular: os detalhes cobrem a conversa. */
@media (max-width: 767px) {
  .pane--info {
    grid-template-columns: minmax(0, 1fr);
  }

  .pane--info .pane__window {
    display: none;
  }

  .pane__info {
    border-left: none;
  }
}
</style>
