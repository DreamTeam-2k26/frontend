<script setup>
defineProps({ project: { type: Object, required: true } })

function formatDate(value) {
  if (!value) return 'Não informada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Não informada'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(date)
}
</script>

<template>
  <section class="project-overview" aria-labelledby="overview-title">
    <h2 id="overview-title">Visão geral</h2>
    <dl class="project-overview__summary">
      <div class="project-overview__card">
        <dt>Criado em</dt>
        <dd>
          <time v-if="project.created_at" :datetime="project.created_at">{{
            formatDate(project.created_at)
          }}</time
          ><span v-else>Não informada</span>
        </dd>
      </div>
      <div class="project-overview__card">
        <dt>Última atualização</dt>
        <dd>
          <time v-if="project.updated_at" :datetime="project.updated_at">{{
            formatDate(project.updated_at)
          }}</time
          ><span v-else>Não informada</span>
        </dd>
      </div>
      <div class="project-overview__card">
        <dt>Identificador do projeto</dt>
        <dd>#{{ project.id }}</dd>
      </div>
    </dl>
    <div class="project-overview__details">
      <section class="project-overview__card" aria-labelledby="project-info-title">
        <h3 id="project-info-title">Informações do projeto</h3>
        <dl class="project-overview__info">
          <div>
            <dt>Nome</dt>
            <dd>{{ project.name }}</dd>
          </div>
          <div>
            <dt>Identificador do criador</dt>
            <dd>{{ project.created_by != null ? `#${project.created_by}` : 'Não informado' }}</dd>
          </div>
        </dl>
      </section>
      <section class="project-overview__card" aria-labelledby="project-access-title">
        <h3 id="project-access-title">Seu acesso</h3>
        <p v-if="project.role === 'owner'">
          Você é dono deste projeto. A edição do nome e da descrição está disponível em Meus
          Projetos.
        </p>
        <p v-else-if="project.role === 'admin'">
          Você é administrador deste projeto. A edição do nome e da descrição está disponível em
          Meus Projetos.
        </p>
        <p v-else-if="project.role === 'member'">
          Você é membro deste projeto e pode consultar suas informações.
        </p>
        <p v-else>Seu papel não foi informado.</p>
      </section>
    </div>
  </section>
</template>

<style scoped>
.project-overview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
h2,
h3 {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}
.project-overview__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}
.project-overview__details {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--space-4);
}
.project-overview__card {
  min-width: 0;
  padding: var(--space-5);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow-wrap: anywhere;
}
dt,
p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
dd {
  margin-top: var(--space-2);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}
.project-overview__summary dd {
  font-weight: var(--font-weight-semibold);
}
.project-overview__info {
  display: grid;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
p {
  margin-top: var(--space-4);
  line-height: var(--line-height-base);
}
@media (max-width: 700px) {
  .project-overview__summary,
  .project-overview__details {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
