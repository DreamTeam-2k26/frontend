<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Link, Copy, Send } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import TeamDialog from '@/components/members/TeamDialog.vue'
import { createInvite, findInviteUser } from '@/api/invites'
import { inviteUrl, inviteStatus, teamError, roles } from '@/components/members/teamState'
import { useConnection } from '@/composables/useConnection'
const props = defineProps({
  projectId: { type: [String, Number], required: true },
  actorRole: { type: String, required: true },
})
const emit = defineEmits(['close', 'created', 'permission-error'])
const email = ref(''),
  role = ref('member'),
  expiresAt = ref(''),
  result = ref(null),
  selected = ref(false)
const searching = ref(false),
  saving = ref(false),
  error = ref(''),
  message = ref(''),
  generated = ref(null)
const { offline } = useConnection()
const url = computed(() => (generated.value ? inviteUrl(generated.value.token) : ''))
let active = true,
  sequence = 0,
  controller
watch(email, () => {
  sequence++
  controller?.abort()
  searching.value = false
  result.value = null
  selected.value = false
  error.value = ''
  message.value = ''
})
watch([role, expiresAt], () => {
  generated.value = null
  message.value = ''
})
async function find() {
  if (searching.value || saving.value || offline.value) return
  error.value = ''
  message.value = ''
  result.value = null
  selected.value = false
  const input = email.value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
    error.value = 'Informe um e-mail completo válido.'
    return
  }
  const current = ++sequence
  controller?.abort()
  controller = new AbortController()
  searching.value = true
  try {
    const users = await findInviteUser(props.projectId, input, { signal: controller.signal })
    if (!active || current !== sequence) return
    result.value = users[0] || null
    if (!result.value)
      message.value =
        'Nenhuma pessoa disponível com esse e-mail. Ela pode já participar do projeto.'
  } catch (cause) {
    if (active && current === sequence) {
      error.value = teamError(cause)
      if ([403, 404].includes(cause.response?.status)) emit('permission-error')
    }
  } finally {
    if (active && current === sequence) searching.value = false
  }
}
async function send(kind) {
  if (saving.value || searching.value || offline.value) return
  error.value = ''
  message.value = ''
  if (kind === 'direct' && (!selected.value || !result.value)) {
    error.value = 'Busque e confirme a pessoa convidada.'
    return
  }
  const date = expiresAt.value ? new Date(expiresAt.value) : null
  if (date && (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())) {
    error.value = 'A validade precisa estar no futuro.'
    return
  }
  saving.value = true
  try {
    const invite = await createInvite({
      project: props.projectId,
      kind,
      role: props.actorRole === 'owner' ? role.value : 'member',
      ...(kind === 'direct' && { invited_user: result.value.id }),
      ...(date && { expires_at: date.toISOString() }),
    })
    if (!active) return
    if (kind === 'link' && invite.token) {
      generated.value = invite
      message.value = 'Link gerado. Compartilhe com as pessoas que deseja convidar.'
    } else if (kind === 'link')
      error.value =
        'O servidor não devolveu um link. Confira os convites antes de tentar novamente.'
    else {
      message.value = 'Convite disponível dentro do Fluxo para a conta selecionada.'
      result.value = null
      selected.value = false
    }
    emit('created', invite)
  } catch (cause) {
    if (active) {
      error.value = teamError(cause)
      if ([403, 404].includes(cause.response?.status)) emit('permission-error')
    }
  } finally {
    if (active) saving.value = false
  }
}
async function copy() {
  if (!generated.value || inviteStatus(generated.value) !== 'pending') {
    error.value = 'Este link expirou. Gere um novo convite.'
    return
  }
  try {
    await navigator.clipboard.writeText(url.value)
    if (active) message.value = 'Link copiado.'
  } catch {
    if (active) error.value = 'Não foi possível copiar. Selecione o endereço no campo para copiar.'
  }
}
onBeforeUnmount(() => {
  active = false
  sequence++
  controller?.abort()
})
</script>
<template>
  <TeamDialog title="Convidar participantes" :busy="saving" @close="emit('close')">
    <div class="invite-form">
      <p>
        Convide alguém cadastrado no Fluxo. O convite aparece na conta da pessoa; não enviamos
        e-mail.
      </p>
      <p v-if="offline" role="status">Você está offline. Reconecte-se para convidar.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="message" role="status">{{ message }}</p>
      <form @submit.prevent="find">
        <BaseInput
          v-model="email"
          label="E-mail completo da pessoa"
          type="email"
          name="invite-email"
          placeholder="pessoa@exemplo.com"
          autofocus
          required
          :disabled="saving || offline"
        /><BaseButton
          type="submit"
          variant="secondary"
          :loading="searching"
          :disabled="saving || offline"
          >Buscar pessoa</BaseButton
        >
      </form>
      <label v-if="result" class="recipient"
        ><input v-model="selected" type="checkbox" :disabled="saving || offline" />Confirmo o
        convite para {{ result.name }} ({{ email.trim() }})</label
      >
      <label for="invite-role">Permissão</label
      ><select id="invite-role" v-model="role" :disabled="saving || offline">
        <option value="member">Membro</option>
        <option v-if="actorRole === 'owner'" value="admin">Administrador</option>
      </select>
      <BaseDatePicker
        v-model="expiresAt"
        label="Validade (opcional)"
        datetime
        calendar-title="Validade do convite no Fluxo"
        :disabled="saving || offline"
      />
      <BaseButton
        :loading="saving"
        :disabled="!selected || searching || offline"
        @click="send('direct')"
        ><Send :size="16" aria-hidden="true" />Enviar convite direto</BaseButton
      >
      <section class="link-section" aria-labelledby="invite-link-title">
        <h3 id="invite-link-title">Ou compartilhe um link de convite</h3>
        <p>O link concede o papel escolhido e pode ser reutilizado até expirar ou ser revogado.</p>
        <BaseButton
          variant="secondary"
          :disabled="saving || searching || offline"
          @click="send('link')"
          ><Link :size="16" aria-hidden="true" />Gerar novo link</BaseButton
        >
        <template v-if="generated"
          ><BaseInput
            :model-value="url"
            label="Link de convite gerado"
            readonly
            @focus="$event.target.select()"
          />
          <p>
            Papel: {{ roles[generated.role] }} ·
            {{
              generated.expires_at
                ? `Validade: ${new Date(generated.expires_at).toLocaleString('pt-BR')}`
                : 'Sem expiração informada'
            }}
          </p>
          <BaseButton variant="secondary" :disabled="offline" @click="copy"
            ><Copy :size="16" aria-hidden="true" />Copiar link</BaseButton
          ></template
        >
      </section>
    </div>
  </TeamDialog>
</template>
<style scoped>
.invite-form,
form,
.link-section {
  display: grid;
  gap: var(--space-3);
}
p {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}
label,
h3 {
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.recipient {
  display: flex;
  align-items: start;
  gap: var(--space-2);
  overflow-wrap: anywhere;
}
select {
  min-height: 2.75rem;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-input-bg);
  color: var(--color-text);
}
.link-section {
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-2);
  padding-top: var(--space-4);
}
</style>
