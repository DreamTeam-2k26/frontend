<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { MessagesSquare, WifiOff } from 'lucide-vue-next'
import { toast } from 'vue3-toastify'
import ChatWindow from '../components/ChatWindow.vue'
import NewRoomModal from '../components/NewRoomModal.vue'
import RoomInfoPanel from '../components/RoomInfoPanel.vue'
import RoomList from '../components/RoomList.vue'
import { STATUS } from '../lib/socketClient'
import { useChatStore } from '../stores/chat'

const route = useRoute()
const router = useRouter()
const chat = useChatStore()

const maxFileMb = Number(import.meta.env.VITE_CHAT_MAX_UPLOAD_MB) || 10

const showNewRoom = ref(false)
const creating = ref(false)
const infoOpen = ref(false)

const routeRoomId = computed(() => (route.params.roomId ? Number(route.params.roomId) : null))
const room = computed(() => chat.activeRoom)
const detail = computed(() => (room.value ? chat.details[room.value.id] : null))

// A sala da URL precisa existir para este usuário; senão volta para a lista.
const roomMissing = computed(
  () =>
    routeRoomId.value !== null &&
    chat.roomsLoaded &&
    !chat.loadingRooms &&
    !chat.roomsError &&
    !room.value,
)

// O chat (WebSocket, salas, avisos) é iniciado no layout; aqui só se abre/fecha a sala da URL.
onBeforeUnmount(() => chat.closeRoom())

watch(
  routeRoomId,
  (id) => {
    infoOpen.value = false
    chat.openRoom(id)
  },
  { immediate: true },
)

watch(roomMissing, (missing) => {
  if (!missing) return

  toast.error('Sala não encontrada.')
  router.replace({ name: 'chat' })
})

// A sala aberta saiu da lista (removido, saiu ou foi apagada): fecha a conversa.
watch(
  () => chat.activeRoomId,
  (id) => {
    if (id === null && routeRoomId.value !== null && chat.roomsLoaded)
      router.replace({ name: 'chat' })
  },
)

watch(infoOpen, (open) => {
  if (open && room.value) chat.loadDetail(room.value.id)
})

const banner = computed(() => {
  if (chat.connection === STATUS.UNAUTHORIZED) return 'unauthorized'
  if ([STATUS.RECONNECTING, STATUS.CONNECTING].includes(chat.connection) && chat.roomsLoaded)
    return 'offline'

  return null
})

function selectRoom(id) {
  router.push({ name: 'chat', params: { roomId: id } })
}

async function createRoom(payload) {
  creating.value = true

  const created = await chat.createRoom(payload)

  creating.value = false

  if (created) {
    showNewRoom.value = false
    selectRoom(created.id)
  }
}

async function leave() {
  const id = room.value.id

  if (await chat.leaveRoom(id)) router.replace({ name: 'chat' })
}
</script>

<template>
  <div class="chat" :class="{ 'chat--room': routeRoomId !== null, 'chat--info': infoOpen && room }">
    <p v-if="banner === 'offline'" class="chat__banner" role="status">
      <WifiOff :size="16" aria-hidden="true" />
      Reconectando...
      <button type="button" @click="chat.retryConnection()">Tentar agora</button>
    </p>
    <p v-else-if="banner === 'unauthorized'" class="chat__banner chat__banner--error" role="alert">
      Sua sessão expirou.
      <RouterLink :to="{ name: 'login', query: { redirect: route.fullPath } }"
        >Entrar novamente</RouterLink
      >
    </p>

    <RoomList
      class="chat__rooms"
      :rooms="chat.rooms"
      :active-id="routeRoomId"
      :loading="chat.loadingRooms"
      :error="chat.roomsError"
      @select="selectRoom"
      @new="showNewRoom = true"
      @retry="chat.loadRooms()"
    />

    <ChatWindow
      v-if="room"
      class="chat__window"
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
      @back="router.push({ name: 'chat' })"
      @info="infoOpen = !infoOpen"
      @load-older="chat.loadOlder()"
      @send="chat.sendText($event.body, $event.replyTo)"
      @send-file="chat.sendFile($event.file, $event.replyTo)"
      @edit="chat.editMessage($event.id, $event.body)"
      @delete="chat.deleteMessage($event)"
      @typing="chat.notifyTyping()"
    />
    <section v-else class="chat__empty">
      <MessagesSquare :size="48" aria-hidden="true" />
      <p v-if="routeRoomId !== null">Abrindo sala...</p>
      <p v-else>Escolha uma sala de conversa ou crie uma nova.</p>
    </section>

    <RoomInfoPanel
      v-if="infoOpen && room"
      class="chat__info"
      :room="room"
      :detail="detail"
      :me-id="chat.me?.id ?? null"
      :presence="chat.presence"
      @close="infoOpen = false"
      @rename="chat.updateRoom(room.id, $event)"
      @add="chat.addMembers(room.id, $event)"
      @remove="chat.removeMember(room.id, $event)"
      @admin="chat.setAdmin(room.id, $event.userId, $event.isAdmin)"
      @leave="leave"
    />

    <NewRoomModal
      v-if="showNewRoom"
      :saving="creating"
      @close="showNewRoom = false"
      @create="createRoom"
    />
  </div>
</template>

<style scoped>
.chat {
  display: grid;
  grid-template-columns: minmax(16rem, 22rem) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  height: calc(100dvh - var(--header-height));
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}

.chat--info {
  grid-template-columns: minmax(16rem, 22rem) minmax(0, 1fr) minmax(16rem, 20rem);
}

.chat__banner {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem;
  color: #92400e;
  font-size: 0.875rem;
  background-color: #fef3c7;
}

.chat__banner--error {
  color: #991b1b;
  background-color: #fee2e2;
}

.chat__banner button,
.chat__banner a {
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
}

.chat__rooms {
  grid-row: 2;
  border-right: 1px solid var(--color-border);
}

.chat__window,
.chat__empty {
  grid-row: 2;
}

.chat__info {
  grid-row: 2;
  border-left: 1px solid var(--color-border);
}

.chat__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--color-text-secondary);
  background-color: var(--color-background);
}

/* Celular: uma tela por vez (lista -> conversa), detalhes sobre a conversa. */
@media (max-width: 767px) {
  .chat {
    grid-template-columns: minmax(0, 1fr);
    height: calc(
      100dvh - var(--header-height) - var(--mobile-nav-height) - env(safe-area-inset-bottom)
    );
  }

  .chat--info {
    grid-template-columns: minmax(0, 1fr);
  }

  .chat__rooms {
    border-right: none;
  }

  .chat--room .chat__rooms,
  .chat:not(.chat--room) .chat__window,
  .chat:not(.chat--room) .chat__empty,
  .chat:not(.chat--room) .chat__info {
    display: none;
  }

  .chat--info .chat__window {
    display: none;
  }

  .chat__info {
    border-left: none;
  }
}
</style>
