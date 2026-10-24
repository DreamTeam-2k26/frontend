<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MotionConfig } from 'motion-v'
import BrandTransition from '@/components/layout/BrandTransition.vue'
import { useAppTransition } from '@/composables/useAppTransition'

const router = useRouter()
const transition = useAppTransition()
// Enquanto a marca cobre a tela, o conteúdo por baixo não recebe foco nem cliques.
const covered = computed(() => transition.visible.value && !transition.contentReady.value)

// A abertura espera a rota inicial (sessão, redirect e convite resolvidos pelo router).
onMounted(() => transition.intro(router.isReady()))
</script>

<template>
  <MotionConfig reduced-motion="user">
    <div class="app-root" :inert="covered">
      <RouterView />
    </div>
    <BrandTransition />
  </MotionConfig>
</template>

<style scoped>
.app-root {
  display: contents;
}
</style>
