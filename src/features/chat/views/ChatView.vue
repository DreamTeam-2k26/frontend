<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { MessagesSquare, WifiOff } from 'lucide-vue-next'
import { toast } from 'vue3-toastify'
import ChatPane from '../components/ChatPane.vue'
import RoomList from '../components/RoomList.vue'
import { STATUS } from '../lib/socketClient'
import { useChatStore } from '../stores/chat'

const route = useRoute()
const router = useRouter()
const chat = useChatStore()

const routeRoomId = computed(() => (route.params.roomId ? Number(route.params.roomId) : null))
const room = computed(() => chat.activeRoom)

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

watch(routeRoomId, (id) => chat.openRoom(id), { immediate: true })

watch(roomMissing, (missing) => {
  if (!missing) return

  toast.error('Sala não encontrada.')
  router.replace({ name: 'chat' })
})

// A sala aberta saiu da lista (saiu do projeto ou o projeto foi apagado): fecha a conversa.
watch(
  () => chat.activeRoomId,
  (id) => {
    if (id === null && routeRoomId.value !== null && chat.roomsLoaded)
      router.replace({ name: 'chat' })
  },
)

const banner = computed(() => {
  if (chat.connection === STATUS.UNAUTHORIZED) return 'unauthorized'
  if ([STATUS.RECONNECTING, STATUS.CONNECTING].includes(chat.connection) && chat.roomsLoaded)
    return 'offline'

  return null
})

function selectRoom(id) {
  router.push({ name: 'chat', params: { roomId: id } })
}
</script>

<template>
  <div class="chat" :class="{ 'chat--room': routeRoomId !== null }">
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
      @retry="chat.loadRooms()"
    />

    <ChatPane v-if="room" class="chat__pane" @back="router.push({ name: 'chat' })" />
    <section v-else class="chat__empty">
      <MessagesSquare :size="48" aria-hidden="true" />
      <p v-if="routeRoomId !== null">Abrindo sala...</p>
      <p v-else>Escolha uma sala de conversa para começar.</p>
    </section>
  </div>
</template>

<style scoped>
/* Claro: fundo branco como antes. Escuro: o mesmo fundo da página inicial. */
.chat {
  --chat-bg: var(--color-background);
  --chat-deep: var(--chat-bg);
}

:global(:root[data-theme='dark']) .chat {
  --chat-bg: var(--color-bg-page, var(--color-surface));

  /* Área das mensagens: um degrau mais escuro que o fundo da página (#141c17 -> #101612). */
  --chat-deep: color-mix(in srgb, var(--chat-bg) 80%, #000000);
}

.chat {
  display: grid;
  grid-template-columns: minmax(16rem, 22rem) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  height: calc(100dvh - var(--header-height));
  background-color: var(--chat-bg, var(--color-background));
  border-bottom: 1px solid var(--color-border);
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

.chat__pane,
.chat__empty {
  grid-row: 2;
}

.chat__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--color-text-secondary);
  background-color: var(--chat-deep, var(--chat-bg, var(--color-background)));
}

/* Celular: uma tela por vez (lista -> conversa), detalhes sobre a conversa. */
@media (max-width: 767px) {
  .chat {
    grid-template-columns: minmax(0, 1fr);
    height: calc(
      100dvh - var(--header-height) - var(--mobile-nav-height) - env(safe-area-inset-bottom)
    );
  }

  .chat__rooms {
    border-right: none;
  }

  .chat--room .chat__rooms,
  .chat:not(.chat--room) .chat__pane,
  .chat:not(.chat--room) .chat__empty {
    display: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .chat__empty {
    animation: fade-in 0.3s ease-out both;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}
</style>
