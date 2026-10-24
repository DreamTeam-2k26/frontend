<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Hand, WifiOff, X } from 'lucide-vue-next'
import ChatAvatar from '../../chat/components/ChatAvatar.vue'
import { formatElapsed } from '../lib/callRules'
import { screenSupported } from '../lib/mediaErrors'
import CallChatPanel from './CallChatPanel.vue'
import CallControls from './CallControls.vue'
import CallTile from './CallTile.vue'
import DeviceSelect from './DeviceSelect.vue'
import TranscriptPanel from './TranscriptPanel.vue'

// A chamada em andamento: quadros, controles e painel lateral (pessoas / conversa).
const props = defineProps({
  call: { type: Object, required: true },
  room: { type: Object, required: true }, // retorno de useCallRoom
  view: { type: Object, required: true }, // espelho de useLocalMedia
  me: { type: Object, required: true }, // { name, avatar }
  transcription: { type: Object, required: true }, // retorno (reativo) de useTranscription
  canEnd: Boolean,
})
const emit = defineEmits(['leave', 'end', 'select'])

const panel = ref('')
const settings = ref(null)
const elapsed = ref(0)
let timer = null

onMounted(() => {
  const tick = () => {
    elapsed.value = (Date.now() - new Date(props.call.started_at ?? Date.now()).getTime()) / 1000
  }

  tick()
  timer = setInterval(tick, 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const PANELS = { people: 'Participantes', chat: 'Conversa do projeto', transcript: 'Transcrição' }

const peers = computed(() => props.room.peers)
const reconnecting = computed(() => props.room.connection !== 'open')

const screens = computed(() => {
  const list = []

  if (props.view.screenOn && props.room.localScreenStream) {
    list.push({
      key: 'me',
      name: props.me.name,
      stream: props.room.localScreenStream,
      rev: props.room.mediaRev,
    })
  }

  peers.value.forEach((peer) => {
    if (peer.state.screen && peer.streams?.screen.getTracks().length) {
      list.push({ key: peer.user, name: peer.name, stream: peer.streams.screen, rev: peer.rev })
    }
  })

  return list
})

const total = computed(() => peers.value.length + 1)
const spotlight = computed(() => screens.value.length > 0)
const gridColumns = computed(() => {
  const count = total.value + screens.value.length

  return count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4
})
// No celular em pé, 1 ou 2 pessoas ocupam a largura toda (quadros maiores); com mais gente, 2 colunas.
const gridColumnsSmall = computed(() => (total.value + screens.value.length <= 2 ? 1 : 2))

function togglePanel(name) {
  panel.value = panel.value === name ? '' : name
}

function openSettings() {
  settings.value?.showModal()
}
</script>

<template>
  <div class="room">
    <header class="room__header">
      <div class="room__title">
        <strong>{{ call.title }}</strong>
        <span>{{ call.project_name }}</span>
      </div>
      <span v-if="reconnecting" class="room__badge room__badge--warn" role="status">
        <WifiOff :size="14" aria-hidden="true" /> Reconectando…
      </span>
      <span v-if="transcription.enabled" class="room__badge room__badge--rec" role="status">
        <span class="room__rec" aria-hidden="true" /> Transcrevendo
      </span>
      <span class="room__badge" aria-label="Tempo de chamada">{{ formatElapsed(elapsed) }}</span>
      <span class="room__badge">{{ total }} {{ total === 1 ? 'pessoa' : 'pessoas' }}</span>
    </header>

    <div class="room__main">
      <div
        class="stage"
        :class="{ 'stage--spotlight': spotlight }"
        :style="spotlight ? null : { '--cols': gridColumns, '--cols-sm': gridColumnsSmall }"
      >
        <div v-if="spotlight" class="stage__focus">
          <CallTile
            v-for="screen in screens.slice(0, 1)"
            :key="`screen-${screen.key}`"
            :name="screen.name"
            :stream="screen.stream"
            :rev="screen.rev"
            video-on
            muted
            screen
          />
        </div>
        <div class="stage__people">
          <CallTile
            :name="me.name"
            :avatar="me.avatar"
            :stream="room.localCameraStream"
            :rev="room.mediaRev"
            :video-on="view.cameraOn"
            :mic-off="!view.micOn"
            :hand="room.hand"
            :speaking="room.selfSpeaking"
            muted
            mirrored
            self
          />
          <CallTile
            v-for="peer in peers"
            :key="peer.user"
            :name="peer.name"
            :avatar="peer.avatar"
            :stream="peer.streams?.camera ?? null"
            :rev="peer.rev"
            :video-on="peer.state.camera"
            :mic-off="!peer.state.mic"
            :hand="peer.state.hand"
            :speaking="peer.speaking"
            :status="peer.status"
          />
          <CallTile
            v-for="screen in screens.slice(1)"
            :key="`screen-${screen.key}`"
            :name="screen.name"
            :stream="screen.stream"
            :rev="screen.rev"
            video-on
            muted
            screen
          />
        </div>
      </div>

      <aside v-if="panel" class="side" :aria-label="PANELS[panel]">
        <header class="side__header">
          <strong>{{ PANELS[panel] }}</strong>
          <button type="button" class="side__close" aria-label="Fechar painel" @click="panel = ''">
            <X :size="18" aria-hidden="true" />
          </button>
        </header>
        <CallChatPanel v-if="panel === 'chat'" :project-id="call.project" />
        <TranscriptPanel
          v-else-if="panel === 'transcript'"
          :call="call"
          :transcription="transcription"
          :segments="room.segments"
          :mic-on="view.micOn"
          :can-manage="canEnd"
        />
        <ul v-else class="people">
          <li>
            <ChatAvatar :name="me.name" :src="me.avatar" :size="32" />
            <span class="people__name">{{ me.name }} (você)</span>
            <Hand v-if="room.hand" :size="16" class="people__hand" aria-label="Mão levantada" />
          </li>
          <li v-for="peer in peers" :key="peer.user">
            <ChatAvatar :name="peer.name" :src="peer.avatar" :size="32" />
            <span class="people__name">{{ peer.name }}</span>
            <Hand
              v-if="peer.state.hand"
              :size="16"
              class="people__hand"
              aria-label="Mão levantada"
            />
          </li>
        </ul>
      </aside>
    </div>

    <CallControls
      :mic-on="view.micOn"
      :camera-on="view.cameraOn"
      :screen-on="view.screenOn"
      :hand="room.hand"
      :can-share="screenSupported()"
      :panel="panel"
      :transcribing="transcription.enabled"
      :can-end="canEnd"
      @mic="room.toggleMic()"
      @camera="room.toggleCamera()"
      @screen="room.toggleScreen()"
      @hand="room.toggleHand()"
      @settings="openSettings"
      @panel="togglePanel"
      @leave="emit('leave')"
      @end="emit('end')"
    />

    <p
      v-if="view.errors.screen || view.errors.camera || view.errors.mic"
      class="room__error"
      role="alert"
    >
      {{ view.errors.screen || view.errors.camera || view.errors.mic }}
    </p>

    <dialog ref="settings" class="room__dialog dialog-motion" aria-labelledby="room-settings-title">
      <form method="dialog">
        <h2 id="room-settings-title">Dispositivos</h2>
        <DeviceSelect
          :view="view"
          id-prefix="room"
          @select="(kind, id) => emit('select', kind, id)"
        />
        <button class="room__dialog-close" value="close">Fechar</button>
      </form>
    </dialog>
  </div>
</template>

<style scoped>
/* Painéis e avisos entram curtos; os tiles e seus <video> não são remontados nem animados. */
.side {
  animation: room-side-in var(--motion-base) var(--ease-flow) both;
}
.room__badge {
  animation: room-badge-in var(--motion-quick) var(--ease-flow) both;
}
@keyframes room-side-in {
  from {
    opacity: 0;
    transform: translateX(12px);
  }
}
@keyframes room-badge-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
.room {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.room__header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: max(var(--space-3), env(safe-area-inset-top))
    max(var(--space-4), env(safe-area-inset-right)) var(--space-3)
    max(var(--space-4), env(safe-area-inset-left));
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.room__title {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 10rem;
  font-size: var(--font-size-sm);
}

.room__title span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.room__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.125rem var(--space-3);
  font-size: var(--font-size-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg-subtle);
}

.room__badge--warn {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}

.room__badge--rec {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}

.room__rec {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--color-danger);
}

.room__main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.stage {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr));
  align-content: center;
  gap: var(--space-3);
  min-width: 0;
  overflow-y: auto;
  padding: var(--space-4);
}

.stage--spotlight {
  grid-template-columns: minmax(0, 1fr) minmax(10rem, 14rem);
  align-content: start;
}

.stage__people {
  display: contents;
}

.stage--spotlight .stage__people {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.stage__focus {
  align-self: stretch;
}

.stage__focus :deep(.tile) {
  height: 100%;
  min-height: 16rem;
}

.side {
  display: flex;
  flex-direction: column;
  width: min(24rem, 40%);
  min-width: 18rem;
  border-left: 1px solid var(--color-border);
  background: var(--color-bg-card);
}

.side__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.side__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  margin: calc(var(--space-2) * -1) calc(var(--space-3) * -1) calc(var(--space-2) * -1) 0;
  color: var(--color-text-secondary);
  border-radius: 50%;
  touch-action: manipulation;
}

.people {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  overflow-y: auto;
}

.people li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.people__name {
  flex: 1;
  overflow-wrap: anywhere;
}

.people__hand {
  color: #b58900;
}

.room__error {
  padding: var(--space-2) var(--space-4);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  background: var(--color-danger-soft);
}

.room__dialog {
  margin: auto;
  width: min(24rem, calc(100% - 2rem));
  padding: var(--space-6);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

.room__dialog::backdrop {
  background: color-mix(in srgb, var(--color-text) 45%, transparent);
}

.room__dialog form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.room__dialog-close {
  align-self: flex-end;
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}

@media (max-width: 600px) {
  .stage:not(.stage--spotlight) {
    grid-template-columns: repeat(var(--cols-sm, 1), minmax(0, 1fr));
    grid-auto-rows: max-content; /* os quadros mantêm a proporção e a área rola, em vez de se sobrepor */
    align-content: start;
    padding: var(--space-3);
  }
}

@media (max-width: 800px) {
  .room__main {
    flex-direction: column;
  }

  .side {
    width: 100%;
    min-width: 0;
    max-height: 55%;
    border-top: 1px solid var(--color-border);
    border-left: 0;
  }

  .stage--spotlight {
    grid-template-columns: 1fr;
  }
}

/* Celular deitado: pouca altura. Cabeçalho enxuto e painel ao lado dos vídeos, não embaixo. */
@media (max-height: 500px) {
  .room__header {
    padding-block: var(--space-2);
  }

  .room__title span {
    display: none;
  }

  .stage {
    align-content: start;
    padding: var(--space-2);
    gap: var(--space-2);
  }

  .stage__focus :deep(.tile) {
    min-height: 0;
  }

  .room__main {
    flex-direction: row;
  }

  .side {
    width: min(20rem, 50%);
    min-width: 0;
    max-height: none;
    border-top: 0;
    border-left: 1px solid var(--color-border);
  }

  .stage--spotlight {
    grid-template-columns: minmax(0, 1fr) minmax(8rem, 12rem);
  }
}
</style>
