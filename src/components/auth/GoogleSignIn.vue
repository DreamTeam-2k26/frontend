<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import { mountGoogleButton } from '@/services/googleIdentity'
import { googleAuthError } from '@/utils/googleAuthError'
import BaseButton from '@/components/ui/BaseButton.vue'

const props = defineProps({
  disabled: Boolean,
  mode: { type: String, default: 'login' },
})
const emit = defineEmits(['success'])
const auth = useAuthStore()
const { isDark } = useTheme()
const target = ref(null)
const loadingScript = ref(true)
const busy = ref(false)
const error = ref('')
const configurationError = ref(false)
const blocked = computed(() => props.disabled || auth.loading || busy.value)
let cleanup
let version = 0
let mounted = false
let resizeObserver
let resizeTimer

async function credentialReceived(credential) {
  if (!mounted || blocked.value) return
  error.value = ''
  if (!credential) {
    error.value = 'O Google não retornou uma credencial. Selecione sua conta novamente.'
    return
  }
  busy.value = true
  try {
    const result =
      props.mode === 'link' ? await auth.linkGoogle(credential) : await auth.loginGoogle(credential)
    if (mounted && result) emit('success', result)
  } catch (cause) {
    if (mounted) error.value = googleAuthError(cause, props.mode === 'link')
  } finally {
    busy.value = false
  }
}

async function render() {
  const current = ++version
  cleanup?.()
  loadingScript.value = true
  configurationError.value = false
  error.value = ''
  try {
    const dispose = await mountGoogleButton(target.value, {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      theme: isDark.value ? 'filled_black' : 'outline',
      disabled: () => !mounted || blocked.value,
      onCredential: credentialReceived,
      isCurrent: () => mounted && current === version,
    })
    if (!mounted || current !== version) dispose()
    else cleanup = dispose
  } catch (cause) {
    if (mounted && current === version) {
      configurationError.value = true
      error.value = cause.message
    }
  } finally {
    if (mounted && current === version) loadingScript.value = false
  }
}
onMounted(() => {
  mounted = true
  render()
  let width = target.value.clientWidth
  resizeObserver = new ResizeObserver(([entry]) => {
    const next = Math.round(entry.contentRect.width)
    if (Math.abs(next - width) < 2) return
    width = next
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (mounted && !busy.value) render()
    }, 150)
  })
  resizeObserver.observe(target.value)
})
watch(isDark, () => {
  if (mounted) render()
})
onBeforeUnmount(() => {
  mounted = false
  resizeObserver?.disconnect()
  clearTimeout(resizeTimer)
  version++
  cleanup?.()
})
</script>

<template>
  <div class="google-sign-in" :aria-busy="loadingScript || busy">
    <p v-if="mode === 'login'" class="google-sign-in__divider"><span>ou</span></p>
    <div ref="target" class="google-sign-in__button" :inert="blocked || loadingScript" />
    <p v-if="loadingScript || busy" role="status">
      {{
        busy
          ? mode === 'link'
            ? 'Vinculando conta…'
            : 'Entrando com Google…'
          : 'Carregando Google…'
      }}
    </p>
    <p v-if="error" class="google-sign-in__error" role="alert">{{ error }}</p>
    <BaseButton
      v-if="configurationError"
      variant="secondary"
      :disabled="loadingScript"
      @click="render"
    >
      Tentar novamente
    </BaseButton>
    <p v-if="!loadingScript && !configurationError" class="google-sign-in__hint">
      {{
        mode === 'link'
          ? 'Selecione a conta Google que deseja vincular ao Fluxo.'
          : 'Use sua conta Google para entrar ou criar uma conta no Fluxo.'
      }}
      Se a janela não abrir ou você cancelar, pode tentar novamente pelo botão acima.
    </p>
  </div>
</template>

<style scoped>
.google-sign-in {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}
.google-sign-in__button {
  min-height: 44px;
  max-width: 100%;
  overflow: hidden;
}
.google-sign-in__button[inert] {
  opacity: 0.6;
}
.google-sign-in__divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.google-sign-in__divider::before,
.google-sign-in__divider::after {
  flex: 1;
  height: 1px;
  content: '';
  background-color: var(--color-border);
}
.google-sign-in__hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
.google-sign-in__error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
</style>
