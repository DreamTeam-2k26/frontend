<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, CalendarDays, RotateCw } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import ProjectNextCall from '@/features/calls/components/ProjectNextCall.vue'
import BrainstormShortcut from '@/components/brainstorm/BrainstormShortcut.vue'

const { metrics, upcoming, members } = defineProps({
  project: { type: Object, required: true },
  // Seções da store projectOverview: { status: idle|loading|refreshing|ready|error, data, error }
  metrics: { type: Object, required: true },
  upcoming: { type: Object, required: true },
  members: { type: Object, required: true },
  // Discussões abertas do Brainstorm (null enquanto carrega ou se falhar).
  brainstormOpen: { type: Number, default: null },
})

const emit = defineEmits({
  retry: (section) => ['metrics', 'upcoming', 'members'].includes(section),
})

const loading = (section) => section.status === 'idle' || section.status === 'loading'
const stats = computed(() => metrics.data)
const busy = computed(() => loading(metrics) || loading(upcoming) || loading(members))
const metric = (value) => (loading(metrics) ? '…' : (value ?? '—'))
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

const totalCaption = computed(() => {
  if (loading(metrics)) return 'Carregando indicadores…'
  if (!stats.value) return 'Indicadores indisponíveis'
  if (!stats.value.total) return 'Nenhuma tarefa criada ainda'
  return plural(stats.value.pending, 'pendente', 'pendentes')
})
const progressCaption = computed(() => {
  if (stats.value) {
    const { done, total } = stats.value
    return `${done} de ${total} ${total === 1 ? 'tarefa concluída' : 'tarefas concluídas'}`
  }
  return loading(metrics) ? 'Carregando progresso…' : 'Progresso indisponível'
})
const overdueCaption = computed(() => {
  if (!stats.value) return 'Prazos indisponíveis'
  return stats.value.overdue ? 'Precisa de atenção' : 'Nenhuma tarefa atrasada'
})

// Distribuição das tarefas por situação (abaixo da barra de progresso).
const breakdown = computed(() => {
  if (!stats.value) return []
  const { todo, inProgress, done } = stats.value
  return [
    { key: 'todo', label: 'A fazer', value: todo },
    { key: 'doing', label: 'Em andamento', value: inProgress },
    { key: 'done', label: 'Concluídas', value: done },
  ]
})

const roles = { owner: 'Dono', admin: 'Administrador', member: 'Membro' }
const priorities = { high: 'Alta', medium: 'Média', low: 'Baixa' }
function dueDate(value) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? 'Sem data'
    : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
        .format(date)
        .replace('.', '')
}
function initials(member) {
  return (member.user_name || 'Participante')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('pt-BR')
}
</script>

<template>
  <div class="overview" :aria-busy="busy">
    <div v-if="metrics.status === 'error'" class="panel overview__alert" role="alert">
      <p>{{ metrics.error }}</p>
      <BaseButton variant="secondary" @click="emit('retry', 'metrics')">
        <RotateCw :size="15" aria-hidden="true" /> Tentar novamente
      </BaseButton>
    </div>

    <dl class="overview__metrics" :class="{ 'is-refreshing': metrics.status === 'refreshing' }">
      <div class="panel metric">
        <dt>Tarefas no projeto</dt>
        <dd>{{ metric(stats?.total) }}</dd>
        <p>{{ totalCaption }}</p>
      </div>
      <div class="panel metric">
        <dt>Concluídas</dt>
        <dd>{{ metric(stats?.done) }}</dd>
        <p>{{ stats ? `${stats.progress}% do projeto` : 'Progresso indisponível' }}</p>
      </div>
      <div class="panel metric" :class="{ 'metric--alert': stats?.overdue }">
        <dt>Tarefas atrasadas</dt>
        <dd :class="{ metric__danger: stats?.overdue }">{{ metric(stats?.overdue) }}</dd>
        <p>{{ overdueCaption }}</p>
      </div>
    </dl>

    <div class="overview__columns">
      <section class="panel deliveries" aria-labelledby="progress-title">
        <div class="section-heading">
          <h2 id="progress-title">Progresso geral</h2>
          <strong class="progress-value">{{ stats ? `${stats.progress}%` : '—' }}</strong>
        </div>
        <p class="progress-caption">{{ progressCaption }}</p>
        <progress
          v-if="stats"
          :value="stats.progress"
          max="100"
          aria-label="Progresso geral do projeto"
        >
          {{ stats.progress }}%
        </progress>
        <div v-else class="progress-empty" aria-hidden="true" />

        <ul v-if="stats?.total" class="breakdown" aria-label="Tarefas por situação">
          <li v-for="item in breakdown" :key="item.key" class="breakdown__item">
            <span
              class="breakdown__dot"
              :class="`breakdown__dot--${item.key}`"
              aria-hidden="true"
            />
            {{ item.label }}
            <strong>{{ item.value }}</strong>
          </li>
        </ul>

        <div class="section-heading deliveries__heading">
          <h2>Próximas entregas</h2>
          <RouterLink
            class="kanban-link"
            :to="{ name: 'project-kanban', params: { id: project.id } }"
          >
            Abrir Kanban <span aria-hidden="true">→</span>
          </RouterLink>
        </div>
        <p v-if="loading(upcoming)" role="status">Carregando próximas entregas…</p>
        <div v-else-if="upcoming.status === 'error'" class="section-error" role="alert">
          <p>{{ upcoming.error }}</p>
          <button type="button" class="retry-link" @click="emit('retry', 'upcoming')">
            Tentar novamente
          </button>
        </div>
        <p v-else-if="!upcoming.data?.length">Nenhuma entrega pendente com prazo definido.</p>
        <ul v-else class="delivery-list">
          <li v-for="task in upcoming.data" :key="task.id">
            <span class="delivery-list__title">{{ task.title }}</span>
            <span
              v-if="priorities[task.priority]"
              class="priority"
              :class="`priority--${task.priority}`"
              >{{ priorities[task.priority] }}</span
            >
            <time :datetime="task.due_date" :class="{ 'is-late': task.is_overdue }">
              {{ dueDate(task.due_date) }}
              <span v-if="task.is_overdue" class="visually-hidden">(atrasada)</span>
            </time>
          </li>
        </ul>
      </section>

      <div class="overview__side">
        <section class="panel meeting" aria-labelledby="meeting-title">
          <div class="section-heading">
            <h2 id="meeting-title">Próxima reunião</h2>
            <CalendarDays :size="17" aria-hidden="true" />
          </div>
          <ProjectNextCall :project="project" />
        </section>
        <BrainstormShortcut :project-id="project.id" :open="brainstormOpen" />
        <section class="panel participants" aria-labelledby="participants-title">
          <div class="section-heading">
            <h2 id="participants-title">Participantes</h2>
            <span v-if="members.data">{{ plural(members.data.length, 'membro', 'membros') }}</span>
          </div>
          <p v-if="loading(members)" role="status">Carregando participantes…</p>
          <div v-else-if="members.status === 'error'" class="section-error" role="alert">
            <p>{{ members.error }}</p>
            <button type="button" class="retry-link" @click="emit('retry', 'members')">
              Tentar novamente
            </button>
          </div>
          <ul
            v-else-if="members.data?.length"
            class="avatars"
            aria-label="Participantes do projeto"
          >
            <li
              v-for="member in members.data.slice(0, 5)"
              :key="member.id"
              :title="member.user_name || 'Participante'"
              :aria-label="member.user_name || 'Participante'"
            >
              {{ initials(member) }}
            </li>
            <li
              v-if="members.data.length > 5"
              :aria-label="`Mais ${members.data.length - 5} participantes`"
            >
              +{{ members.data.length - 5 }}
            </li>
          </ul>
          <p v-else>Nenhum participante disponível.</p>
          <p v-if="members.data?.length">Todos podem colaborar nas tarefas.</p>
          <BaseButton variant="ghost" :to="{ name: 'project-members', params: { id: project.id } }"
            >Ver participantes <ArrowRight :size="16" aria-hidden="true"
          /></BaseButton>
        </section>
      </div>
    </div>
    <details class="project-info">
      <summary>Informações do projeto</summary>
      <dl>
        <div>
          <dt>Identificador do projeto</dt>
          <dd>#{{ project.id }}</dd>
        </div>
        <div>
          <dt>Seu papel</dt>
          <dd>{{ roles[project.role] || 'Não informado' }}</dd>
        </div>
        <div>
          <dt>Criado em</dt>
          <dd>
            <time :datetime="project.created_at">{{
              project.created_at
                ? new Date(project.created_at).toLocaleString('pt-BR')
                : 'Não informada'
            }}</time>
          </dd>
        </div>
        <div>
          <dt>Atualizado em</dt>
          <dd>
            <time :datetime="project.updated_at">{{
              project.updated_at
                ? new Date(project.updated_at).toLocaleString('pt-BR')
                : 'Não informada'
            }}</time>
          </dd>
        </div>
        <div>
          <dt>Identificador do criador</dt>
          <dd>{{ project.created_by != null ? `#${project.created_by}` : 'Não informado' }}</dd>
        </div>
      </dl>
    </details>
  </div>
</template>

<style scoped>
.overview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.overview__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}
.panel {
  min-width: 0;
  padding: var(--space-6);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow-wrap: anywhere;
}
.metric dt {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.metric dd {
  margin-top: var(--space-2);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}
.metric p {
  margin-top: var(--space-3);
}
.metric__danger {
  color: var(--color-danger);
}
p,
time,
.section-heading > span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.overview__columns {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--space-4);
}
.overview__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
h2 {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.progress-value {
  color: var(--color-primary-hover);
  font-size: var(--font-size-sm);
}
.progress-caption {
  margin-top: var(--space-4);
  margin-bottom: var(--space-3);
}
progress,
.progress-empty {
  display: block;
  width: 100%;
  height: var(--space-2);
  border: 0;
  border-radius: var(--radius-full);
  overflow: hidden;
  appearance: none;
  background: var(--color-bg-subtle);
  color: var(--color-primary);
}
progress::-webkit-progress-bar {
  background: var(--color-bg-subtle);
}
progress::-webkit-progress-value {
  background: var(--color-primary);
  border-radius: var(--radius-full);
}
progress::-moz-progress-bar {
  background: var(--color-primary);
  border-radius: var(--radius-full);
}
.deliveries {
  min-height: 21rem;
}
.deliveries__heading {
  margin-top: var(--space-6);
  margin-bottom: var(--space-2);
}
.kanban-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 2.75rem;
  color: var(--color-primary-hover);
  font-size: var(--font-size-xs);
}
.delivery-list li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 3.25rem;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-xs);
}
.delivery-list__title {
  flex: 1;
  min-width: 0;
}
time {
  flex-shrink: 0;
}
.priority {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}
.priority--high {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}
.priority--medium {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}
.priority--low {
  color: var(--color-success);
  background: var(--color-success-soft);
}
.meeting p {
  margin-block: var(--space-4);
}
.participants {
  flex: 1;
}
.avatars {
  display: flex;
  flex-wrap: wrap;
  padding-left: var(--space-1);
  margin-top: var(--space-5);
  margin-bottom: var(--space-3);
}
.avatars li {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  margin-left: calc(-1 * var(--space-1));
  width: 2rem;
  height: 2rem;
  border: 2px solid var(--color-bg-card);
  border-radius: var(--radius-full);
  color: var(--color-text);
  background: var(--color-secondary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.project-info {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.project-info summary {
  cursor: pointer;
  padding-block: var(--space-2);
}
.project-info dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  padding-block: var(--space-4);
}
.project-info dd {
  color: var(--color-text);
}
.overview__alert {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border-color: color-mix(in srgb, var(--color-danger) 40%, var(--color-border));
  background: var(--color-danger-soft);
}
.overview__alert p {
  color: var(--color-text);
  font-size: var(--font-size-sm);
}
/* Atualizando o mesmo projeto: os números atuais ficam, esmaecidos, até chegarem os novos. */
.overview__metrics {
  transition: opacity 0.2s ease;
}
.overview__metrics.is-refreshing {
  opacity: 0.6;
}
/* Atrasadas só ganham destaque quando existem. */
.metric--alert {
  border-color: color-mix(in srgb, var(--color-danger) 35%, var(--color-border));
}
.breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-5);
  margin-top: var(--space-4);
}
.breakdown__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.breakdown__item strong {
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}
.breakdown__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  background: var(--color-status-todo);
}
.breakdown__dot--doing {
  background: var(--color-warning);
}
.breakdown__dot--done {
  background: var(--color-status-done);
}
.section-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  padding-block: var(--space-3);
}
.retry-link {
  color: var(--color-primary-hover);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-decoration: underline;
}
time.is-late {
  color: var(--color-status-late);
  font-weight: var(--font-weight-semibold);
}
@media (max-width: 700px) {
  .overview__metrics,
  .overview__columns {
    grid-template-columns: minmax(0, 1fr);
  }
  .panel {
    padding: var(--space-5);
  }
  .deliveries {
    min-height: auto;
  }
}
</style>
