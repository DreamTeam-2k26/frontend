<script setup>
import { computed, ref, watch } from 'vue'
import { UserRound } from 'lucide-vue-next'
import { mediaUrl } from '@/features/chat/lib/urls'

const props = defineProps({ member: { type: Object, required: true } })
const failed = ref(false)
const url = computed(() => mediaUrl(props.member.profile_picture))
watch(url, () => {
  failed.value = false
})
</script>

<template>
  <span
    class="member-avatar"
    role="img"
    :aria-label="`Participante ${member.id}`"
    :title="`Participante ${member.id}`"
  >
    <img v-if="url && !failed" :src="url" alt="" loading="lazy" @error="failed = true" />
    <UserRound v-else :size="14" aria-hidden="true" />
  </span>
</template>

<style scoped>
.member-avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  overflow: hidden;
  border: 2px solid var(--color-bg-card);
  border-radius: var(--radius-full);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
}
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
