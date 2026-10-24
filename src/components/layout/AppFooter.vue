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
  padding: var(--space-4) var(--space-6);
  color: var(--color-text-secondary);
  text-align: center;
  border-top: 1px solid var(--color-border);
}

.footer small {
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
}

@media (max-width: 767px) {
  .footer {
    padding: var(--space-3) var(--space-4);
  }
}
</style>
