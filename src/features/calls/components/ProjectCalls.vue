<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarPlus, Pencil, Play, Trash2, Video } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import { apiMessage, canInvite } from '@/components/projects/memberRules'
import { formatWhen, isDue, participantsText } from '../lib/callRules'
import { createCall, listCalls, removeCall, startCall, updateCall } from '../services/callsApi'
import { useCallNotifier } from '../stores/callNotifier'
import ScheduleCallDialog from './ScheduleCallDialog.vue'

// Aba "Reuniões" do projeto: chamada em andamento, agendadas e histórico.
const props = defineProps({ project: { type: Object, required: true } })

const router = useRouter()
const notifier = useCallNotifier()
const manager = computed(() => canInvite(props.project.role))
const live = computed(() => notifier.liveFor(props.project.id))
const upcoming = computed(() => notifier.upcomingFor(props.project.id))
const history = ref([])
const now = ref(Date.now())

const dialog = ref(null) // { mode, call }
const saving = ref(false)
const formError = ref('')
const message = ref('')
const problem = ref('')
const busyId = ref(null)
const confirmId = ref(null)
let tick = null
let active = true

async function loadHistory() {
  try {
    const ended = await listCalls({ project: props.project.id, status: 'ended' })

    if (active) history.value = ended.slice(0, 5)
  } catch {
    // o histórico é um extra: se falhar, o resto da aba segue funcionando
  }
}

onMounted(() => {
  notifier.load()
  loadHistory()
  tick = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
})
onBeforeUnmount(() => {
  active = false
  clearInterval(tick)
})
watch(live, (value, previous) => {
  if (previous && !value) loadHistory()
})

const enter = (call) =>
  router.push({ name: 'call', params: { id: props.project.id, callId: call.id } })

function openDialog(mode, call = null) {
  formError.value = ''
  message.value = ''
  problem.value = ''
  dialog.value = { mode, call }
}

async function save(payload) {
  if (saving.value) return

  saving.value = true
  formError.value = ''

  try {
    const { mode, call } = dialog.value

    if (mode === 'now') {
      const created = await createCall({ project: props.project.id, title: payload.title })

      dialog.value = null
      await notifier.load()
      enter(created)

      return
    }

    if (mode === 'edit') await updateCall(call.id, payload)
    else await createCall({ project: props.project.id, ...payload })

    message.value = mode === 'edit' ? 'Reunião atualizada.' : 'Reunião agendada.'
    dialog.value = null
    await notifier.load()
  } catch (error) {
    formError.value = apiMessage(error, 'Não foi possível salvar a reunião.')
  } finally {
    saving.value = false
  }
}

async function startScheduled(call) {
  if (busyId.value) return

  busyId.value = call.id
  problem.value = ''

  try {
    const started = await startCall(call.id)

    await notifier.load()
    enter(started)
  } catch (error) {
    problem.value = apiMessage(error, 'Não foi possível iniciar a reunião.')
  } finally {
    busyId.value = null
  }
}

async function cancel(call) {
  if (busyId.value) return

  busyId.value = call.id
  problem.value = ''

  try {
    await removeCall(call.id)
    message.value = 'Reunião cancelada.'
    await notifier.load()
  } catch (error) {
    problem.value = apiMessage(error, 'Não foi possível cancelar a reunião.')
  } finally {
    busyId.value = null
    confirmId.value = null
  }
}
</script>

<template>
  <section class="calls" aria-labelledby="calls-title">
    <header class="calls__header">
      <h2 id="calls-title">Reuniões</h2>
      <div v-if="manager" class="calls__actions">
        <BaseButton variant="secondary" @click="openDialog('schedule')"
          ><CalendarPlus :size="16" aria-hidden="true" /> Agendar</BaseButton
        >
        <BaseButton v-if="!live" @click="openDialog('now')"
          ><Video :size="16" aria-hidden="true" /> Iniciar agora</BaseButton
        >
      </div>
    </header>

    <p v-if="message" class="calls__ok" role="status">{{ message }}</p>
    <p v-if="problem" class="calls__error" role="alert">{{ problem }}</p>

    <article v-if="live" class="live" aria-label="Chamada em andamento">
      <span class="live__dot" aria-hidden="true" />
      <div class="live__text">
        <strong>{{ live.title }}</strong>
        <span>Em andamento · {{ participantsText(live.participants_count) }}</span>
      </div>
      <BaseButton @click="enter(live)"
        ><Video :size="16" aria-hidden="true" /> Entrar na chamada</BaseButton
      >
    </article>
    <p v-else class="calls__muted">
      Nenhuma chamada em andamento.
      <template v-if="!manager">O dono ou um administrador pode iniciar uma reunião.</template>
    </p>

    <h3>Agendadas</h3>
    <p v-if="!upcoming.length" class="calls__muted">Nenhuma reunião agendada.</p>
    <ul v-else class="list">
      <li v-for="call in upcoming" :key="call.id">
        <div class="list__text">
          <strong>{{ call.title }}</strong>
          <span>
            {{ formatWhen(call.scheduled_for) }}
            <em v-if="isDue(call, now)" class="list__due">Chegou a hora</em>
          </span>
          <p v-if="call.description">{{ call.description }}</p>
        </div>
        <div v-if="manager" class="list__actions">
          <BaseButton
            :disabled="busyId === call.id || !!live"
            :title="live ? 'Já existe uma chamada em andamento' : ''"
            @click="startScheduled(call)"
            ><Play :size="16" aria-hidden="true" /> Iniciar</BaseButton
          >
          <BaseButton
            variant="secondary"
            :aria-label="`Editar ${call.title}`"
            @click="openDialog('edit', call)"
            ><Pencil :size="16" aria-hidden="true"
          /></BaseButton>
          <template v-if="confirmId !== call.id">
            <BaseButton
              variant="secondary"
              :aria-label="`Cancelar ${call.title}`"
              @click="confirmId = call.id"
              ><Trash2 :size="16" aria-hidden="true"
            /></BaseButton>
          </template>
          <template v-else>
            <BaseButton variant="secondary" @click="confirmId = null">Manter</BaseButton>
            <BaseButton :loading="busyId === call.id" @click="cancel(call)"
              >Cancelar reunião</BaseButton
            >
          </template>
        </div>
      </li>
    </ul>

    <template v-if="history.length">
      <h3>Anteriores</h3>
      <ul class="list list--history">
        <li v-for="call in history" :key="call.id">
          <div class="list__text">
            <strong>{{ call.title }}</strong>
            <span>{{ formatWhen(call.started_at) }}</span>
          </div>
        </li>
      </ul>
    </template>

    <ScheduleCallDialog
      v-if="dialog"
      :mode="dialog.mode"
      :call="dialog.call"
      :saving="saving"
      :error="formError"
      @save="save"
      @close="dialog = null"
    />
  </section>
</template>

<style scoped>
.calls {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

.calls__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
}

h2 {
  font-size: var(--font-size-lg);
}

h3 {
  margin-top: var(--space-3);
  font-size: var(--font-size-md);
}

.calls__actions,
.list__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.calls__muted {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.calls__ok,
.calls__error {
  padding: var(--space-3);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-md);
}

.calls__ok {
  color: var(--color-success);
  background: var(--color-success-soft);
}

.calls__error {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.live {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-md);
  background: var(--color-success-soft);
}

.live__dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--color-success);
  animation: live-pulse 1.6s ease-in-out infinite;
}

.live__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 10rem;
  overflow-wrap: anywhere;
}

.live__text span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}

.list__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 10rem;
  overflow-wrap: anywhere;
}

.list__text span,
.list__text p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.list__text p {
  margin-top: var(--space-1);
  white-space: pre-wrap;
}

.list__due {
  margin-left: var(--space-2);
  color: var(--color-warning);
  font-style: normal;
  font-weight: var(--font-weight-medium);
}

@keyframes live-pulse {
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .live__dot {
    animation: none;
  }
}
</style>
