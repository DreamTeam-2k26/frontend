<script setup>
import { appConfig } from '@/config/app'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <small>© {{ year }} {{ appConfig.name }}. {{ appConfig.footerText }}</small>
  </footer>
</template>

<style scoped>
.footer {
  padding: 1rem;
  color: var(--color-text-secondary);
  text-align: center;
  border-top: 1px solid var(--color-border);
}
</style>
