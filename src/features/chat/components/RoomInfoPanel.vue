<script setup>
import { computed, ref } from 'vue'
import { LogOut, Pencil, ShieldCheck, ShieldOff, UserMinus, X } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatLastSeen } from '../lib/format'
import ChatAvatar from './ChatAvatar.vue'
import UserPicker from './UserPicker.vue'

const { room, detail, meId, presence } = defineProps({
  room: { type: Object, required: true },
  // RoomDetailSerializer (com membros); pode ainda estar carregando.
  detail: { type: Object, default: null },
  meId: { type: Number, default: null },
  // Presença em tempo real por id de usuário (sobrepõe o que veio no detalhe).
  presence: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'rename', 'add', 'remove', 'admin', 'leave'])

const editingName = ref(false)
const name = ref('')
const adding = ref(false)
const picked = ref([])
const image = ref(null)

const members = computed(() => detail?.members ?? [])
const isAdmin = computed(() => detail?.is_admin ?? room.is_admin)

function status(member) {
  const live = presence[member.user.id]
  const online = live ? live.online : member.online
  const lastSeen = live ? live.last_seen : member.last_seen

  return { online, label: online ? 'online' : formatLastSeen(lastSeen) }
}

function startRename() {
  name.value = room.name
  image.value = null
  editingName.value = true
}

function saveRename() {
  const trimmed = name.value.trim()

  if (!trimmed) return

  emit('rename', { name: trimmed !== room.name ? trimmed : undefined, image: image.value })
  editingName.value = false
}

function confirmAdd() {
  if (!picked.value.length) return

  emit(
    'add',
    picked.value.map((user) => user.id),
  )
  picked.value = []
  adding.value = false
}

function cancelAdd() {
  adding.value = false
  picked.value = []
}

function confirmRemove(member) {
  if (window.confirm(`Remover ${member.user.name} da sala?`)) emit('remove', member.user.id)
}

function confirmLeave() {
  if (window.confirm(`Sair de "${room.name}"?`)) emit('leave')
}
</script>

<template>
  <aside class="info" aria-label="Detalhes da sala">
    <header class="info__header">
      <h2>Detalhes</h2>
      <button type="button" aria-label="Fechar detalhes" @click="emit('close')">
        <X :size="20" aria-hidden="true" />
      </button>
    </header>

    <div class="info__body">
      <div class="info__room">
        <ChatAvatar :name="room.name" :src="room.image" :size="72" />

        <form v-if="editingName" class="info__edit" @submit.prevent="saveRename">
          <label class="sr-only" for="room-name">Nome da sala</label>
          <input id="room-name" v-model="name" maxlength="80" autocomplete="off" />
          <input
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Nova imagem"
            @change="image = $event.target.files[0] ?? null"
          />
          <div class="info__edit-actions">
            <BaseButton variant="secondary" @click="editingName = false">Cancelar</BaseButton>
            <BaseButton type="submit">Salvar</BaseButton>
          </div>
        </form>
        <template v-else>
          <h3 class="info__name">{{ room.name }}</h3>
          <p class="info__count">
            {{ room.member_count }} participante{{ room.member_count === 1 ? '' : 's' }}
          </p>
          <BaseButton v-if="isAdmin" variant="ghost" @click="startRename">
            <Pencil :size="14" aria-hidden="true" /> Editar nome e imagem
          </BaseButton>
        </template>
      </div>

      <section class="info__section">
        <header class="info__section-header">
          <h3>Participantes</h3>
          <BaseButton v-if="isAdmin && !adding" variant="ghost" @click="adding = true"
            >Adicionar</BaseButton
          >
        </header>

        <div v-if="adding" class="info__add">
          <UserPicker v-model="picked" :exclude-room="room.id" />
          <div class="info__edit-actions">
            <BaseButton variant="secondary" @click="cancelAdd">Cancelar</BaseButton>
            <BaseButton :disabled="!picked.length" @click="confirmAdd">Adicionar</BaseButton>
          </div>
        </div>

        <p v-if="!detail" class="info__state" role="status">Carregando participantes...</p>

        <ul class="members">
          <li v-for="member in members" :key="member.user.id" class="member">
            <ChatAvatar
              :name="member.user.name"
              :src="member.user.avatar"
              :size="36"
              :online="status(member).online"
            />
            <span class="member__body">
              <span class="member__name">
                {{ member.user.name }}<small v-if="member.user.id === meId"> (você)</small>
              </span>
              <small class="member__status">{{ status(member).label }}</small>
            </span>
            <span v-if="member.is_admin" class="member__badge">admin</span>

            <span v-if="isAdmin && member.user.id !== meId" class="member__actions">
              <button
                type="button"
                :aria-label="
                  member.is_admin
                    ? `Remover admin de ${member.user.name}`
                    : `Tornar ${member.user.name} admin`
                "
                :title="member.is_admin ? 'Remover admin' : 'Tornar admin'"
                @click="emit('admin', { userId: member.user.id, isAdmin: !member.is_admin })"
              >
                <component
                  :is="member.is_admin ? ShieldOff : ShieldCheck"
                  :size="16"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                class="member__danger"
                :aria-label="`Remover ${member.user.name}`"
                title="Remover da sala"
                @click="confirmRemove(member)"
              >
                <UserMinus :size="16" aria-hidden="true" />
              </button>
            </span>
          </li>
        </ul>
      </section>

      <BaseButton variant="secondary" class="info__leave" @click="confirmLeave">
        <LogOut :size="16" aria-hidden="true" /> Sair da sala
      </BaseButton>
    </div>
  </aside>
</template>

<style scoped>
.info {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: var(--chat-bg, var(--color-background));
}

.info__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.info__header button {
  display: inline-flex;
  padding: 0.375rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
}

.info__header button:hover {
  background-color: var(--color-surface);
}

.info__body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem;
  overflow-y: auto;
}

.info__room {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  text-align: center;
}

.info__name {
  overflow-wrap: anywhere;
}

.info__count,
.info__state {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.info__edit {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.info__edit input {
  padding: 0.5rem 0.75rem;
}

.info__edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.info__section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info__add {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.member {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0;
}

.member__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.member__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.member__status {
  color: var(--color-text-secondary);
}

.member__badge {
  padding: 0 0.5rem;
  color: var(--color-primary);
  font-size: 0.75rem;
  border-radius: 999px;
  background-color: color-mix(
    in srgb,
    var(--color-primary) 12%,
    var(--chat-bg, var(--color-background))
  );
}

.member__actions {
  display: inline-flex;
}

.member__actions button {
  display: inline-flex;
  padding: 0.375rem;
  color: var(--color-text-secondary);
  border-radius: 50%;
}

.member__actions button:hover {
  color: var(--color-text);
  background-color: var(--color-surface);
}

.member__actions .member__danger:hover {
  color: var(--color-danger);
}

.info__leave.button--secondary,
.info__leave.button--secondary:hover:not(:disabled) {
  color: var(--color-danger);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
