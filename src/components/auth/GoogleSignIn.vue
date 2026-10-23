<script setup>
import { toast } from 'vue3-toastify'
import googleLogo from '@/assets/google-g.svg'
import BaseButton from '@/components/ui/BaseButton.vue'

const { disabled = false } = defineProps({
  disabled: { type: Boolean, default: false },
})

// Visual pronto; a integração com o Google é uma task futura (backend ainda não tem OAuth).
function onClick() {
  toast.info('Entrar com Google ainda não está disponível. Use e-mail e senha.')
}
</script>

<template>
  <div class="google-sign-in">
    <p class="google-sign-in__divider"><span>ou</span></p>
    <BaseButton variant="secondary" block :disabled="disabled" @click="onClick">
      <img :src="googleLogo" alt="" class="google-sign-in__logo" width="18" height="18" />
      Continuar com Google
    </BaseButton>
  </div>
</template>

<style scoped>
.google-sign-in {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
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

.google-sign-in__logo {
  flex-shrink: 0;
}
</style>
