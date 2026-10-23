<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="stat-card">
    <dt class="stat-card__label">{{ label }}</dt>
    <dd class="stat-card__value">{{ value }}</dd>
    <dd v-if="description" class="stat-card__description">{{ description }}</dd>
  </div>
</template>

<style scoped>
.stat-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}
.stat-card__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.stat-card__value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}
.stat-card__description {
  grid-column: 1 / -1;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}
</style>
