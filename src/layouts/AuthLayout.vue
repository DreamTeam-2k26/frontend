<template>
  <main class="auth-layout">
    <RouterView />
  </main>
</template>

<style scoped>
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--space-6) var(--space-4);
  background-color: var(--color-bg-page);
}
</style>
