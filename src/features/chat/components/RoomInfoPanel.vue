<script setup>
import { computed } from 'vue'
import { ExternalLink, X } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { formatLastSeen } from '../lib/format'
import ChatAvatar from './ChatAvatar.vue'

// Painel somente leitura: nome e participantes vêm do projeto e são geridos lá.
const { room, detail, meId, presence } = defineProps({
  room: { type: Object, required: true },
  // RoomDetailSerializer (com membros); pode ainda estar carregando.
  detail: { type: Object, default: null },
  meId: { type: Number, default: null },
  // Presença em tempo real por id de usuário (sobrepõe o que veio no detalhe).
  presence: { type: Object, default: () => ({}) },
  // Esconde o botão "Gerenciar no projeto" quando o chat já está dentro do projeto.
  inProject: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const ROLES = { owner: 'Dono', admin: 'Administrador', member: 'Membro' }

const members = computed(() => detail?.members ?? [])

function status(member) {
  const live = presence[member.user.id]
  const online = live ? live.online : member.online
  const lastSeen = live ? live.last_seen : member.last_seen

  return { online, label: online ? 'online' : formatLastSeen(lastSeen) }
}

function roleLabel(member) {
  return ROLES[member.role] ?? (member.is_admin ? 'Administrador' : '')
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
        <h3 class="info__name">{{ room.name }}</h3>
        <p class="info__count">
          {{ room.member_count }} participante{{ room.member_count === 1 ? '' : 's' }}
        </p>
        <BaseButton
          v-if="room.project && !inProject"
          variant="secondary"
          :to="{ name: 'project-detail', params: { id: room.project }, query: { aba: 'membros' } }"
        >
          <ExternalLink :size="14" aria-hidden="true" /> Gerenciar no projeto
        </BaseButton>
        <p class="info__hint">Os participantes são os mesmos do projeto.</p>
      </div>

      <section class="info__section">
        <header class="info__section-header">
          <h3>Participantes</h3>
        </header>

        <p v-if="!detail" class="info__state" role="status">Carregando participantes...</p>

        <ul class="members">
          <li v-for="member in members" :key="member.user.id" class="member">
            <ChatAvatar
              :name="member.user.name"
              :src="member.user.avatar"
              :size="36"
              :online="status(member).online"
            />
            <div class="member__body">
              <span class="member__name"
                >{{ member.user.name }}<small v-if="member.user.id === meId"> (você)</small></span
              >
              <small class="member__status">{{ status(member).label }}</small>
            </div>
            <span v-if="roleLabel(member)" class="member__badge">{{ roleLabel(member) }}</span>
          </li>
        </ul>
      </section>
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
.info__hint,
.info__state {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
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
</style>
