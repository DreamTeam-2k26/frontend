<script setup>
import { computed, shallowRef, watch } from 'vue'
import { UserRound } from 'lucide-vue-next'
import { mediaUrl } from '@/features/chat/lib/urls'
import { getInitials } from '@/utils/user'

const {
  name = '',
  src = '',
  size = 'md',
} = defineProps({
  name: { type: String, default: '' },
  // Caminho devolvido pela API (`/media/...`) ou URL local (`blob:`) de uma prévia.
  src: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
})

const failed = shallowRef(false)
const imageUrl = computed(() => (src.startsWith('blob:') ? src : mediaUrl(src)))
const initials = computed(() => getInitials(name))
const iconSize = computed(() => ({ sm: 16, md: 18, lg: 32 })[size])

// Foto nova: tenta carregar de novo mesmo que a anterior tenha falhado.
watch(
  () => src,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <span class="avatar" :class="`avatar--${size}`" aria-hidden="true">
    <!-- key por URL: a foto nova entra com fade em vez de trocar de repente. -->
    <img
      v-if="imageUrl && !failed"
      :key="imageUrl"
      :src="imageUrl"
      alt=""
      class="avatar__image"
      @error="failed = true"
    />
    <span v-else-if="initials">{{ initials }}</span>
    <UserRound v-else :size="iconSize" />
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--color-primary);
  background-color: var(--color-bg-subtle);
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
}

.avatar--sm {
  width: var(--space-8);
  height: var(--space-8);
  font-size: var(--font-size-xs);
}

.avatar--md {
  width: var(--space-10);
  height: var(--space-10);
  font-size: var(--font-size-sm);
}

.avatar--lg {
  width: 6rem;
  height: 6rem;
  font-size: var(--font-size-xl);
  box-shadow: 0 0 0 1px var(--color-border);
}

.avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: avatar-in var(--motion-base) var(--ease-flow) both;
}

@keyframes avatar-in {
  from {
    opacity: 0;
  }
}
</style>
