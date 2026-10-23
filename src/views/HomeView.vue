<script setup>
import BaseButton from '@/components/ui/BaseButton.vue'
</script>

<template>
  <section class="home">
    <h1 class="home__title">Bem-vindo</h1>
    <p class="home__text">
      Esta é a página inicial do template. Troque este conteúdo pelo do seu projeto.
    </p>
    <div class="home__actions">
      <BaseButton :to="{ name: 'login' }">Entrar</BaseButton>
      <BaseButton :to="{ name: 'register' }" variant="secondary">Criar conta</BaseButton>
    </div>
  </section>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 4rem 1rem;
  text-align: center;
}

.home__text {
  max-width: 36rem;
  color: var(--color-text-secondary);
}

.home__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
