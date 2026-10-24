<script setup>
import { computed } from 'vue'
import { Pencil, ArrowUpRight, UsersRound } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import ProjectMemberAvatar from './ProjectMemberAvatar.vue'

const props = defineProps({
  project: { type: Object, required: true },
  compact: { type: Boolean, default: false },
  preview: { type: Boolean, default: false },
  // Chamada em andamento no projeto (objeto da API) ou null.
  liveCall: { type: Object, default: null },
})
defineEmits(['edit'])
const progress = computed(() =>
  Number.isFinite(props.project.progress)
    ? Math.min(100, Math.max(0, props.project.progress))
    : null,
)
const memberCount = computed(() =>
  Number.isInteger(props.project.total_memberships) && props.project.total_memberships >= 0
    ? props.project.total_memberships
    : null,
)
const visibleMembers = computed(() => (props.project.memberships ?? []).slice(0, 3))
const remainingMembers = computed(() =>
  Math.max(0, (memberCount.value ?? 0) - visibleMembers.value.length),
)
const roles = { owner: 'Dono', admin: 'Administrador', member: 'Membro' }
</script>

<template>
  <article class="project-card">
    <div class="project-card__cover" aria-hidden="true" />
    <div class="project-card__body">
      <div class="project-card__heading">
        <h2>{{ project.name }}</h2>
        <span class="project-card__role">{{ roles[project.role] || 'Participante' }}</span>
      </div>
      <RouterLink
        v-if="liveCall"
        class="project-card__live"
        :to="{ name: 'call', params: { id: project.id, callId: liveCall.id } }"
        :aria-label="`Entrar na reunião em andamento de ${project.name}`"
      >
        <span class="project-card__live-dot" aria-hidden="true" />
        Reunião em andamento
        <small v-if="liveCall.participants_count"
          >· {{ liveCall.participants_count }}
          {{ liveCall.participants_count === 1 ? 'pessoa' : 'pessoas' }}</small
        >
      </RouterLink>
      <p class="project-card__description">{{ project.description || 'Sem descrição.' }}</p>
      <div class="project-card__metrics">
        <div v-if="!compact || progress !== null" class="project-card__progress-label">
          <span>Progresso</span>
          <strong>{{ progress === null ? 'Indisponível' : `${progress}%` }}</strong>
        </div>
        <progress
          v-if="progress !== null"
          :value="progress"
          max="100"
          :aria-label="`Progresso de ${project.name}`"
        >
          {{ progress }}%
        </progress>
        <div
          v-if="!compact || memberCount !== null || visibleMembers.length"
          class="project-card__members"
        >
          <span v-if="!compact || memberCount !== null" class="project-card__member-count">
            <UsersRound :size="16" aria-hidden="true" />
            {{
              memberCount === null
                ? 'Participantes indisponíveis'
                : `${memberCount} ${memberCount === 1 ? 'participante' : 'participantes'}`
            }}
          </span>
          <ul
            v-if="visibleMembers.length"
            class="project-card__avatars"
            aria-label="Participantes do projeto"
          >
            <li v-for="member in visibleMembers" :key="member.id">
              <ProjectMemberAvatar :member="member" />
            </li>
            <li
              v-if="remainingMembers"
              class="project-card__remaining"
              :aria-label="`Mais ${remainingMembers} participantes`"
            >
              +{{ remainingMembers }}
            </li>
          </ul>
        </div>
      </div>
      <div class="project-card__actions">
        <BaseButton
          :to="preview ? undefined : { name: 'project-detail', params: { id: project.id } }"
          :disabled="preview"
          :aria-label="
            preview ? `Projeto fictício: ${project.name}` : `Acessar projeto ${project.name}`
          "
          :title="preview ? 'Projeto de demonstração: não existe no backend.' : undefined"
        >
          {{ preview ? 'Projeto de exemplo' : 'Acessar projeto' }}
          <ArrowUpRight v-if="!preview" :size="16" aria-hidden="true" />
        </BaseButton>
        <BaseButton
          v-if="!compact && ['owner', 'admin'].includes(project.role)"
          variant="ghost"
          :aria-label="`Editar ${project.name}`"
          @click="$emit('edit', project)"
          ><Pencil :size="16" aria-hidden="true" /> Editar</BaseButton
        >
      </div>
    </div>
  </article>
</template>

<style scoped>
.project-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.project-card__cover {
  position: relative;
  height: 6rem;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: linear-gradient(110deg, var(--color-bg-subtle), var(--color-secondary));
}
.project-card__cover::before,
.project-card__cover::after {
  content: '';
  position: absolute;
  width: 9rem;
  height: 9rem;
  border: 1rem solid color-mix(in srgb, var(--color-primary) 40%, transparent);
  border-radius: 50%;
  right: 9%;
  top: -4.5rem;
}
.project-card__cover::after {
  right: -2.5rem;
  top: 1.5rem;
  border-width: 0.5rem;
  border-color: color-mix(in srgb, var(--color-bg-card) 55%, transparent);
}
.project-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-1) var(--space-1);
  overflow-wrap: anywhere;
}
h2 {
  font-size: var(--font-size-md);
  min-width: 0;
}
.project-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  flex-wrap: wrap;
}
.project-card__metrics {
  margin-top: auto;
  padding-top: var(--space-2);
  width: 100%;
}
.project-card__progress-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.project-card__progress-label strong {
  color: var(--color-text);
}
progress {
  display: block;
  appearance: none;
  width: 100%;
  height: 0.5rem;
  border: 0;
  border-radius: var(--radius-full);
  overflow: hidden;
  color: var(--color-primary);
  background: var(--color-bg-subtle);
}
progress::-webkit-progress-bar {
  border-radius: var(--radius-full);
  background: var(--color-bg-subtle);
}
progress::-webkit-progress-value {
  border-radius: var(--radius-full);
  background: var(--color-primary);
}
progress::-moz-progress-bar {
  border-radius: var(--radius-full);
  background: var(--color-primary);
}
.project-card__members {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.project-card__member-count {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
}
.project-card__avatars {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.project-card__avatars li {
  display: flex;
}
.project-card__avatars li + li {
  margin-left: -0.5rem;
}
.project-card__remaining {
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 var(--space-1);
  border: 2px solid var(--color-bg-card);
  border-radius: var(--radius-full);
  background: var(--color-bg-subtle);
  font-size: var(--font-size-xs);
  color: var(--color-text);
}
.project-card__description {
  white-space: pre-wrap;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
.project-card__role {
  flex-shrink: 0;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-bg-subtle);
  font-size: var(--font-size-xs);
}
.project-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* Faixa de reunião em andamento: chama atenção sem mudar o resto do cartão. */
.project-card__live {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-full);
  background: var(--color-success-soft);
  color: var(--color-success);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
}
.project-card__live small {
  color: inherit;
}
.project-card__live-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--color-success);
  animation: project-live-pulse 1.6s ease-in-out infinite;
}
@keyframes project-live-pulse {
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}
@media (prefers-reduced-motion: reduce) {
  .project-card__live-dot {
    animation: none;
  }
}

small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
</style>
