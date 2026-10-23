<script setup>
import { computed } from 'vue'
import { ArrowRight, CalendarDays } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'

const props = defineProps({
  project: { type: Object, required: true },
  overview: { type: Object, default: null },
  loading: Boolean,
})
const tasks = computed(() => props.overview?.tasks)
const columns = computed(() => props.overview?.columns)
const members = computed(() => props.overview?.members)
const complete = (task) =>
  columns.value?.find((column) => column.id === task.column)?.category === 'done'
const done = computed(() =>
  tasks.value && columns.value ? tasks.value.filter(complete).length : null,
)
const progress = computed(() =>
  done.value === null
    ? null
    : tasks.value.length
      ? Math.round((done.value / tasks.value.length) * 100)
      : 0,
)
const overdue = computed(() => tasks.value?.filter((task) => task.is_overdue).length ?? null)
const upcoming = computed(() =>
  tasks.value && columns.value
    ? tasks.value
        .filter((task) => task.due_date && !complete(task))
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 3)
    : null,
)
const roles = { owner: 'Dono', admin: 'Administrador', member: 'Membro' }
const priorities = { high: 'Alta', medium: 'Média', low: 'Baixa' }
const metric = (value) => (props.loading ? '…' : (value ?? '—'))
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
  <div class="overview" :aria-busy="loading">
    <dl class="overview__metrics">
      <div class="panel metric">
        <dt>Tarefas no projeto</dt>
        <dd>{{ metric(tasks?.length) }}</dd>
        <p>
          {{
            loading
              ? 'Carregando tarefas…'
              : columns
                ? `Distribuídas em ${columns.length} etapas`
                : 'Etapas indisponíveis'
          }}
        </p>
      </div>
      <div class="panel metric">
        <dt>Concluídas</dt>
        <dd>{{ metric(done) }}</dd>
        <p>{{ progress === null ? 'Progresso indisponível' : `${progress}% do projeto` }}</p>
      </div>
      <div class="panel metric">
        <dt>Tarefas atrasadas</dt>
        <dd class="metric__danger">{{ metric(overdue) }}</dd>
        <p>
          {{
            overdue === null
              ? 'Prazos indisponíveis'
              : overdue
                ? 'Precisa de atenção'
                : 'Nenhuma tarefa atrasada'
          }}
        </p>
      </div>
    </dl>

    <div class="overview__columns">
      <section class="panel deliveries" aria-labelledby="progress-title">
        <div class="section-heading">
          <h2 id="progress-title">Progresso geral</h2>
          <strong class="progress-value">{{ progress === null ? '—' : `${progress}%` }}</strong>
        </div>
        <p class="progress-caption">
          {{
            done === null
              ? 'Progresso indisponível'
              : `${done} de ${tasks.length} tarefas concluídas`
          }}
        </p>
        <progress
          v-if="progress !== null"
          :value="progress"
          max="100"
          aria-label="Progresso geral do projeto"
        >
          {{ progress }}%
        </progress>
        <div v-else class="progress-empty" aria-hidden="true" />
        <div class="section-heading deliveries__heading">
          <h2>Próximas entregas</h2>
          <button
            type="button"
            class="kanban-link"
            disabled
            title="O Kanban ainda não está disponível nesta tela."
          >
            Abrir Kanban <span aria-hidden="true">→</span>
          </button>
        </div>
        <p v-if="loading" role="status">Carregando próximas entregas…</p>
        <p v-else-if="!upcoming">Não foi possível carregar as entregas.</p>
        <p v-else-if="!upcoming.length">Nenhuma entrega com prazo definida.</p>
        <ul v-else class="delivery-list">
          <li v-for="task in upcoming" :key="task.id">
            <span class="delivery-list__title">{{ task.title }}</span>
            <span
              v-if="priorities[task.priority]"
              class="priority"
              :class="`priority--${task.priority}`"
              >{{ priorities[task.priority] }}</span
            >
            <time :datetime="task.due_date">{{ dueDate(task.due_date) }}</time>
          </li>
        </ul>
      </section>

      <div class="overview__side">
        <section class="panel meeting" aria-labelledby="meeting-title">
          <div class="section-heading">
            <h2 id="meeting-title">Próxima reunião</h2>
            <CalendarDays :size="17" aria-hidden="true" />
          </div>
          <p>Nenhuma reunião disponível.</p>
          <BaseButton disabled title="Não há uma reunião disponível para entrar."
            ><ArrowRight :size="16" aria-hidden="true" /> Entrar na reunião</BaseButton
          >
        </section>
        <section class="panel participants" aria-labelledby="participants-title">
          <div class="section-heading">
            <h2 id="participants-title">Participantes</h2>
            <span v-if="members"
              >{{ members.length }} {{ members.length === 1 ? 'membro' : 'membros' }}</span
            >
          </div>
          <p v-if="loading" role="status">Carregando participantes…</p>
          <p v-else-if="!members">Não foi possível carregar os participantes.</p>
          <ul v-else-if="members.length" class="avatars" aria-label="Participantes do projeto">
            <li
              v-for="member in members.slice(0, 5)"
              :key="member.id"
              :title="member.user_name || 'Participante'"
              :aria-label="member.user_name || 'Participante'"
            >
              {{ initials(member) }}
            </li>
            <li v-if="members.length > 5" :aria-label="`Mais ${members.length - 5} participantes`">
              +{{ members.length - 5 }}
            </li>
          </ul>
          <p v-else>Nenhum participante disponível.</p>
          <p v-if="members?.length">Todos podem colaborar nas tarefas.</p>
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
