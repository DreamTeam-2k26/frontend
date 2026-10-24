<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue3-toastify'
import BaseButton from '@/components/ui/BaseButton.vue'
import { personName } from '@/components/projects/memberRules'
import { useAuthStore } from '@/stores/auth'
import { apiErrorMessage } from '../../chat/lib/errors'
import CallRoom from '../components/CallRoom.vue'
import PreJoin from '../components/PreJoin.vue'
import { useCallRoom, PHASE } from '../composables/useCallRoom'
import { useLocalMedia } from '../composables/useLocalMedia'
import { useTranscription } from '../composables/useTranscription'
import { isLive } from '../lib/callRules'
import { mediaSupported } from '../lib/mediaErrors'
import { endCall, getCall } from '../services/callsApi'
import { useCallNotifier } from '../stores/callNotifier'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notifier = useCallNotifier()

const callId = Number(route.params.callId)
const projectId = Number(route.params.id)

const call = ref(null)
const loadError = ref('')
const joining = ref(false)
const confirmingEnd = ref(false)
const stage = ref('loading') // loading | prejoin | room | over

const { media, view } = useLocalMedia({ keepAlive: true })
const room = reactive(useCallRoom({ callId, media }))
const transcription = reactive(useTranscription({ callId, room, view, media }))

const me = computed(() => ({
  name: personName(auth.user?.name, auth.user?.email) || 'Você',
  avatar: auth.user?.profile_picture?.url ?? null,
}))
const supported = mediaSupported()
const backTo = computed(() => ({
  name: 'project-detail',
  params: { id: projectId },
  query: { aba: 'reunioes' },
}))
const overText = computed(
  () =>
    ({
      [PHASE.LEFT]: 'Você saiu da chamada.',
      [PHASE.ENDED]: 'A chamada foi encerrada.',
      [PHASE.REPLACED]: 'Você entrou nesta chamada em outra aba ou janela.',
      [PHASE.DENIED]: room.error || 'Não foi possível entrar na chamada.',
    })[room.phase] ?? '',
)

async function load() {
  try {
    const data = await getCall(callId)

    if (data.project !== projectId) throw new Error('mismatch')

    call.value = data

    if (!isLive(data)) {
      loadError.value =
        data.status === 'scheduled'
          ? 'Esta reunião ainda não começou.'
          : 'Esta chamada já foi encerrada.'
      stage.value = 'over'

      return
    }

    stage.value = 'prejoin'
    await media.start({ mic: true, camera: true })
  } catch (error) {
    loadError.value =
      error?.message === 'mismatch'
        ? 'Chamada não encontrada.'
        : apiErrorMessage(error, 'Chamada não encontrada.')
    stage.value = 'over'
  }
}

function enter() {
  joining.value = true
  notifier.activeCallId = callId
  stage.value = 'room'
  room.join()
}

function finishAndLeave() {
  room.leave()
}

async function endForAll() {
  confirmingEnd.value = false

  try {
    await endCall(callId)
  } catch (error) {
    toast.error(apiErrorMessage(error, 'Não foi possível encerrar a chamada.'))
  }
}

function again() {
  router.go(0)
}

// Fora da sala (saiu, acabou, abriu em outra aba) a câmera e o microfone são soltos.
function onOver() {
  if (
    stage.value === 'room' &&
    [PHASE.LEFT, PHASE.ENDED, PHASE.REPLACED, PHASE.DENIED].includes(room.phase)
  ) {
    media.stopAll()
    notifier.activeCallId = null
    stage.value = 'over'
  }
}

watch(() => room.phase, onOver)

function beforeUnload(event) {
  if (stage.value !== 'room') return

  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  load()
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  media.stopAll()

  if (notifier.activeCallId === callId) notifier.activeCallId = null
})

const canEnd = computed(() => !!call.value?.can_manage)
</script>

<template>
  <div class="call-page">
    <div v-if="stage === 'loading'" class="call-page__state" role="status">Carregando chamada…</div>

    <div v-else-if="stage === 'over'" class="call-page__state" role="status">
      <h1>{{ loadError ? 'Chamada indisponível' : overText }}</h1>
      <p v-if="loadError">{{ loadError }}</p>
      <div class="call-page__actions">
        <BaseButton
          v-if="!loadError && room.phase !== PHASE.REPLACED && room.phase !== PHASE.ENDED"
          variant="secondary"
          @click="again"
          >Entrar de novo</BaseButton
        >
        <BaseButton :to="backTo">Voltar ao projeto</BaseButton>
      </div>
    </div>

    <template v-else-if="stage === 'prejoin'">
      <p v-if="!supported" class="call-page__warn" role="alert">
        Este navegador ou endereço não permite câmera e microfone (é preciso HTTPS ou localhost).
        Você ainda pode entrar para ouvir e ver os outros.
      </p>
      <PreJoin
        :call="call"
        :view="view"
        :media="media"
        :busy="joining"
        @mic="media.setMic(!media.micOn)"
        @camera="media.setCamera(!media.cameraOn)"
        @select="(kind, id) => media.selectDevice(kind, id)"
        @join="enter"
        @cancel="router.push(backTo)"
      />
      <RouterLink class="call-page__back" :to="backTo">Voltar ao projeto</RouterLink>
    </template>

    <CallRoom
      v-else-if="stage === 'room'"
      :call="call"
      :room="room"
      :view="view"
      :me="me"
      :transcription="transcription"
      :can-end="canEnd"
      @leave="finishAndLeave"
      @end="confirmingEnd = true"
      @select="(kind, id) => media.selectDevice(kind, id)"
    />

    <div
      v-if="confirmingEnd"
      class="call-page__confirm"
      role="alertdialog"
      aria-labelledby="end-title"
    >
      <div class="call-page__confirm-box">
        <h2 id="end-title">Encerrar a chamada para todos?</h2>
        <p>Todas as pessoas serão desconectadas.</p>
        <div class="call-page__actions">
          <BaseButton variant="secondary" @click="confirmingEnd = false">Cancelar</BaseButton>
          <BaseButton @click="endForAll">Encerrar para todos</BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.call-page {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--color-surface);
}

.call-page__state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-6);
  text-align: center;
}

.call-page__state h1 {
  font-size: var(--font-size-xl);
}

.call-page__state p {
  color: var(--color-text-secondary);
}

.call-page__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
}

.call-page__warn {
  margin: var(--space-4) var(--space-4) 0;
  padding: var(--space-3);
  color: var(--color-warning);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-md);
  background: var(--color-warning-soft);
}

.call-page__confirm {
  position: fixed;
  inset: 0;
  z-index: 950;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: color-mix(in srgb, var(--color-text) 45%, transparent);
}

.call-page__confirm-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(24rem, 100%);
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

.call-page__confirm-box p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.call-page__back {
  display: inline-flex;
  align-items: center;
  align-self: center;
  min-height: 2.75rem;
  margin-bottom: var(--space-6);
  padding: 0 var(--space-4);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
