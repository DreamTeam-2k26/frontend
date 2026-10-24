<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ClipboardList, FileText, Users, History, ArrowUpRight, RefreshCw } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import activities from '@/api/activities'
import { useAuthStore } from '@/stores/auth'
import { useConnection } from '@/composables/useConnection'
import { useProjectActivities } from '@/composables/useProjectActivities'
import {
  activityCategory,
  activityDay,
  activityTime,
  actorName,
  activityFilters,
  categoryLabel,
  filterActivities,
} from './activityState'
const props = defineProps({ project: { type: Object, required: true } })
const router = useRouter(),
  auth = useAuthStore()
const filter = ref('all'),
  navigating = ref(null),
  destinationError = ref('')
const { items, warnings, loading, error, load, dispose } = useProjectActivities(activities)
// Registros que não existiam na consulta anterior (após "Atualizar"): só eles ganham destaque.
// A primeira carga e o "Mostrar mais" não animam itens já conhecidos.
const seenIds = new Set()
const freshIds = ref(new Set())
watch(items, (list) => {
  const fresh = new Set()
  if (seenIds.size) list.forEach((activity) => !seenIds.has(activity.id) && fresh.add(activity.id))
  list.forEach((activity) => seenIds.add(activity.id))
  freshIds.value = fresh
})
const visibleCount = ref(20)
const filtered = computed(() => filterActivities(items.value, filter.value))
const hasMore = computed(() => filtered.value.length > visibleCount.value)
watch(filter, () => {
  visibleCount.value = 20
})
const { offline } = useConnection(refresh)
const visible = computed(() => filtered.value.slice(0, visibleCount.value))
const groups = computed(() => {
  const result = []
  for (const activity of visible.value) {
    const day = activityDay(activity.created_at)
    const last = result.at(-1)
    if (last?.day === day) last.items.push(activity)
    else result.push({ day, items: [activity] })
  }
  return result
})
const icons = { tasks: ClipboardList, files: FileText, members: Users, other: History }
let generation = 0,
  controller
function refresh() {
  visibleCount.value = 20
  destinationError.value = ''
  if (!offline.value) load(props.project.id)
}
watch(
  () => [props.project.id, auth.user?.id],
  () => {
    generation++
    controller?.abort()
    navigating.value = null
    destinationError.value = ''
    filter.value = 'all'
    visibleCount.value = 20
    load(props.project.id)
  },
  { immediate: true },
)
async function openTarget(event, activity) {
  event.preventDefault()
  if (navigating.value !== null || offline.value) return
  const current = generation
  navigating.value = activity.id
  destinationError.value = ''
  controller?.abort()
  controller = new AbortController()
  try {
    // Revalida no clique: o arquivo/tarefa pode ter sido excluído desde o carregamento.
    const destination = await activities.target(props.project.id, activity, {
      signal: controller.signal,
    })
    if (current !== generation) return
    if (destination) await router.push(destination)
    else {
      activity.destination = null
      destinationError.value = 'Este recurso não está mais disponível neste projeto.'
    }
  } catch {
    if (current === generation) {
      activity.destination = null
      destinationError.value =
        'Não foi possível abrir o recurso. Ele pode ter sido removido ou sua conexão está indisponível.'
    }
  } finally {
    if (current === generation) navigating.value = null
  }
}
onBeforeUnmount(() => {
  generation++
  controller?.abort()
  dispose()
})
</script>
<template>
  <section class="activities" aria-labelledby="activities-title" :aria-busy="loading">
    <header class="activities-header">
      <div>
        <h2 id="activities-title">Registros recentes</h2>
        <p>Tarefas, arquivos e participantes atuais de {{ project.name }}.</p>
      </div>
      <BaseButton variant="secondary" :disabled="offline || loading" @click="refresh"
        ><RefreshCw :size="16" aria-hidden="true" />Atualizar</BaseButton
      >
    </header>
    <p class="history-note">
      Este resumo usa os registros que ainda existem no projeto: criação de tarefas, envio de
      arquivos e ingresso dos participantes atuais. Não inclui alterações, movimentações, exclusões
      ou saídas de participantes. Itens removidos deixam de aparecer após atualizar.
    </p>
    <div class="activities-toolbar">
      <BaseSelect v-model="filter" label="Tipo de registro" :options="activityFilters" />
      <p v-if="items.length" role="status">
        {{ visible.length }} de {{ filtered.length }} registros{{
          filter !== 'all' ? ' deste tipo' : ''
        }}
      </p>
    </div>
    <p v-if="offline" class="notice" role="status">
      Você está offline. Reconecte-se para consultar os registros.
    </p>
    <div v-if="warnings.length" class="notice" role="status">
      <p>Resumo parcial:</p>
      <ul>
        <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
      </ul>
      <BaseButton variant="secondary" :disabled="offline || loading" @click="refresh"
        >Atualizar registros</BaseButton
      >
    </div>
    <p v-if="destinationError" class="error" role="alert">{{ destinationError }}</p>
    <p v-if="loading" class="state" role="status">Consultando tarefas, arquivos e participantes…</p>
    <div v-else-if="error" class="state" role="alert">
      <p>{{ error }}</p>
      <BaseButton variant="secondary" :disabled="offline" @click="refresh"
        >Tentar novamente</BaseButton
      >
    </div>
    <template v-else>
      <div v-if="!visible.length" class="state">
        <History :size="30" aria-hidden="true" />
        <h3>
          {{ items.length ? 'Nenhum registro desse tipo' : 'Nenhum registro disponível' }}
        </h3>
        <p>
          {{
            items.length
              ? 'Escolha outro tipo para consultar os registros.'
              : warnings.length
                ? 'Algumas fontes não puderam ser consultadas. Tente atualizar.'
                : 'Não há registros com data disponível entre os itens atuais do projeto.'
          }}
        </p>
        <BaseButton v-if="filter !== 'all'" variant="ghost" @click="filter = 'all'"
          >Limpar filtro</BaseButton
        >
      </div>
      <!-- Troca de filtro: a lista entra com um fade curto, sem reiniciar a página. -->
      <div :key="filter" class="activity-groups">
        <section
          v-for="group in groups"
          :key="group.day"
          class="activity-group"
          :aria-label="group.day"
        >
          <h3>{{ group.day }}</h3>
          <ol class="timeline">
            <li
              v-for="activity in group.items"
              :key="activity.id"
              :class="{ 'timeline__item--new': freshIds.has(activity.id) }"
            >
              <span class="activity-icon" :class="`activity-icon--${activityCategory(activity)}`"
                ><component :is="icons[activityCategory(activity)]" :size="18" aria-hidden="true"
              /></span>
              <article>
                <div class="activity-meta">
                  <UserAvatar
                    class="activity-meta__avatar"
                    :name="actorName(activity)"
                    :src="activity.actor?.picture || ''"
                    size="sm"
                  /><strong>{{ actorName(activity) }}</strong
                  ><span class="activity-type">{{ categoryLabel(activity) }}</span
                  ><time :datetime="activity.created_at">{{
                    activityTime(activity.created_at)
                  }}</time>
                </div>
                <p class="summary">{{ activity.summary || 'Registro do projeto.' }}</p>
                <a
                  v-if="activity.destination"
                  :href="router.resolve(activity.destination).href"
                  :aria-disabled="offline || navigating !== null || undefined"
                  :aria-busy="navigating === activity.id"
                  @click="openTarget($event, activity)"
                  >{{
                    activityCategory(activity) === 'files'
                      ? 'Ver pasta do arquivo'
                      : 'Abrir tarefa'
                  }}<ArrowUpRight :size="14" aria-hidden="true"
                /></a>
              </article>
            </li>
          </ol>
        </section>
      </div>
      <div v-if="hasMore" class="pagination">
        <BaseButton variant="secondary" @click="visibleCount += 20"
          >Mostrar mais registros</BaseButton
        >
      </div>
    </template>
  </section>
</template>
<style scoped>
.activities {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-6);
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  overflow-wrap: anywhere;
}
.activities-header,
.activities-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}
h2 {
  font-size: var(--font-size-lg);
  margin-bottom: var(--space-1);
}
p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.history-note {
  font-size: var(--font-size-xs);
}
.activities-toolbar :deep(.select) {
  min-width: min(100%, 16rem);
}
.activity-group > h3 {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: capitalize;
  margin-bottom: var(--space-4);
}
.timeline {
  display: grid;
  gap: var(--space-5);
}
.activity-groups {
  display: contents;
}
.activity-groups > .activity-group {
  animation: activity-fade var(--motion-base) var(--ease-flow) both;
}
.timeline__item--new > article {
  animation: activity-new 1.6s var(--ease-flow) both;
}
@keyframes activity-fade {
  from {
    opacity: 0;
  }
}
@keyframes activity-new {
  from {
    opacity: 0;
    transform: translateY(-4px);
    background-color: var(--color-success-soft);
  }
  20% {
    opacity: 1;
    transform: none;
    background-color: var(--color-success-soft);
  }
}
.timeline li {
  position: relative;
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr);
  gap: var(--space-3);
}
.timeline li:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 2.5rem;
  bottom: calc(-1 * var(--space-5));
  left: 1.25rem;
  width: 1px;
  background: var(--color-border);
}
.activity-icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  color: var(--color-primary);
  background: var(--color-bg-subtle);
}
.activity-icon--members {
  color: var(--color-success);
  background: var(--color-success-soft);
}
.activity-icon--files {
  color: var(--color-text-secondary);
}
.activity-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}
.activity-meta__avatar {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.625rem;
}
.activity-meta time {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  margin-left: auto;
}
.activity-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
}
.summary {
  white-space: pre-line;
  margin-top: var(--space-2);
}
article a {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  min-height: 2.75rem;
}
a[aria-disabled='true'] {
  opacity: 0.6;
  cursor: wait;
}
.state {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
}
.state h3 {
  font-size: var(--font-size-md);
}
.notice {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.error {
  color: var(--color-danger);
}
.pagination {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
}
@media (max-width: 600px) {
  .activities {
    padding: var(--space-4);
  }
  .activity-meta time {
    width: 100%;
    margin-left: 0;
  }
}
</style>
