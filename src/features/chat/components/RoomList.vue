<script setup>
import { computed, ref } from 'vue'
import { Plus, Search } from 'lucide-vue-next'
import { formatListTime, messagePreview } from '../lib/format'
import ChatAvatar from './ChatAvatar.vue'

const { rooms, activeId, loading, error } = defineProps({
  rooms: { type: Array, required: true },
  activeId: { type: Number, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['select', 'new', 'retry'])

const filter = ref('')

const visible = computed(() => {
  const term = filter.value.trim().toLowerCase()

  return term ? rooms.filter((room) => room.name.toLowerCase().includes(term)) : rooms
})

function preview(room) {
  const message = room.last_message

  if (!message) return 'Sem mensagens'

  const who = message.author?.name && !message.is_deleted ? `${message.author.name}: ` : ''

  return `${who}${messagePreview(message)}`
}
</script>

<template>
  <section class="rooms" aria-label="Salas de conversa">
    <header class="rooms__header">
      <h2 class="rooms__title">Salas de conversa</h2>
      <button
        type="button"
        class="rooms__new"
        aria-label="Nova sala"
        title="Nova sala"
        @click="emit('new')"
      >
        <Plus :size="20" aria-hidden="true" />
      </button>
    </header>

    <div class="rooms__search">
      <Search :size="16" aria-hidden="true" />
      <input
        v-model="filter"
        type="search"
        placeholder="Filtrar salas"
        aria-label="Filtrar salas"
      />
    </div>

    <p v-if="loading && !rooms.length" class="rooms__state" role="status">Carregando salas...</p>
    <div v-else-if="error && !rooms.length" class="rooms__state rooms__state--error" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="rooms__link" @click="emit('retry')">Tentar novamente</button>
    </div>
    <div v-else-if="!rooms.length" class="rooms__state">
      <p>Você ainda não participa de nenhuma sala.</p>
      <button type="button" class="rooms__link" @click="emit('new')">Criar uma sala</button>
    </div>
    <p v-else-if="!visible.length" class="rooms__state">Nenhuma sala encontrada.</p>

    <ul class="rooms__list">
      <li v-for="room in visible" :key="room.id">
        <button
          type="button"
          class="room"
          :class="{ 'room--active': room.id === activeId }"
          :aria-current="room.id === activeId ? 'true' : undefined"
          @click="emit('select', room.id)"
        >
          <ChatAvatar :name="room.name" :src="room.image" :size="44" />
          <span class="room__body">
            <span class="room__top">
              <span class="room__name">{{ room.name }}</span>
              <time v-if="room.last_message_at" class="room__time">{{
                formatListTime(room.last_message_at)
              }}</time>
            </span>
            <span class="room__bottom">
              <span class="room__preview">{{ preview(room) }}</span>
              <span
                v-if="room.unread > 0"
                class="room__badge"
                :aria-label="`${room.unread} não lidas`"
              >
                {{ room.unread > 99 ? '99+' : room.unread }}
              </span>
            </span>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.rooms {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: var(--color-background);
}

.rooms__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem 0.5rem;
}

.rooms__title {
  font-size: 1.25rem;
}

.rooms__new {
  display: inline-flex;
  padding: 0.5rem;
  color: #ffffff;
  border-radius: 50%;
  background-color: var(--color-primary);
}

.rooms__new:hover {
  background-color: var(--color-primary-hover);
}

.rooms__search {
  position: relative;
  padding: 0 1rem 0.75rem;
}

.rooms__search svg {
  position: absolute;
  top: 0.625rem;
  left: 1.75rem;
  color: var(--color-text-secondary);
}

.rooms__search input {
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
}

.rooms__state {
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.rooms__state--error {
  color: var(--color-danger);
}

.rooms__link {
  margin-top: 0.5rem;
  color: var(--color-primary);
  font-weight: 500;
}

.rooms__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.room {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  border-left: 3px solid transparent;
}

.room:hover {
  background-color: var(--color-surface);
}

.room--active {
  border-left-color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 8%, var(--color-background));
}

.room__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.room__top,
.room__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.room__name {
  overflow: hidden;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.room__time {
  flex-shrink: 0;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.room__preview {
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.room__badge {
  flex-shrink: 0;
  min-width: 1.25rem;
  padding: 0 0.375rem;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.25rem;
  text-align: center;
  border-radius: 999px;
  background-color: var(--color-primary);
}
</style>
