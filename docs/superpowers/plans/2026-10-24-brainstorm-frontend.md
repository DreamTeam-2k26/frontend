# Brainstorm Inteligente — frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Telas do Brainstorm (lista, discussão, síntese, decisão, nova discussão) integradas ao backend Feat-52.
**Architecture:** View → Store → API (CLAUDE.md do frontend); utils puros testados com `node --test`.
**Tech Stack:** Vue 3 `<script setup>` JS, Pinia setup, Vue Router, Axios (`src/api/api.js`), Lucide, vue3-toastify.
**Spec:** `docs/superpowers/specs/2026-10-24-brainstorm-frontend-design.md`

## Global Constraints
- Sem TS/Tailwind; só tokens de `src/assets/main.css`; `<style scoped>` com BEM.
- Views/componentes nunca importam `src/api/`. Não duplicar `/api/`.
- Commits locais `Feat#60-[Ação]` por etapa; nada de push/PR antes do OK do Arthur (CLAUDE.md 5.1).
- Verificação: `npm run build`, `npx eslint <arquivos>`, `node --test src/utils/__tests__/brainstorm.test.js`, navegador nos dois temas com backend real.

## Review Focus
- Trocar de tópico/projeto com resposta lenta pendente: estado antigo não pode aparecer (versão + abort).
- Duplo clique em votar/responder/aprovar: uma requisição só.
- Aprovação com 400 por item (`tasks.{i}`): mostrar o erro no card certo e não sair da tela.
- Tópico arquivado aberto por link direto: somente leitura, sem botões que falham.
- Membro comum: nenhuma ação de dono/admin visível.

### Task 1: Utils puros + testes
`src/utils/brainstorm.js`: `CATEGORY_OPTIONS`, `STATUS_OPTIONS`, `ORDER_OPTIONS`, `categoryLabel`, `statusLabel`,
`topicFlags(topic, role) -> { isOpen, isManager, canEdit(userId), canDelete, readOnly, inReview }`,
`buildThread(replies) -> [{ reply, depth, children }]` (ordem cronológica; órfão vira raiz),
`approvalPayload({ analysisId, text, justification, cards }) -> body`, `normalizeListQuery(query)`.
- [ ] Testes em `src/utils/__tests__/brainstorm.test.js` (falham) → implementar → passam.

### Task 2: API + stores
`src/api/brainstormTopics.js` (list/get/create/update/delete/vote/close/reopen/archive/analyze/getAnalysis/versions/approve),
`src/api/brainstormReplies.js` (list all/create/update/delete/vote). Stores `brainstormList.js`, `brainstormTopic.js`.

### Task 3: Navegação + lista + nova discussão
`projectNavigation.js` (seção + rota), router, `ProjectDetailView` aba, `BrainstormBoard`, `BrainstormTopicCard`,
`BrainstormStatusBadge`, `BrainstormTopicForm`, atalho na Visão geral.

### Task 4: Detalhe/discussão
`views/BrainstormTopicView.vue`, `BrainstormReplyThread`, `BrainstormReplyItem`, `BrainstormReplyComposer`,
`BrainstormVoteControl`, ações encerrar/reabrir/arquivar/excluir.

### Task 5: Síntese
`BrainstormAnalysisPanel` + histórico de versões.

### Task 6: Decisão
`BrainstormDecisionEditor` + `BrainstormTaskCard` + confirmação + links ao Kanban; decisão vigente / em revisão.

### Task 7: Verificação no navegador com backend real + build/eslint/testes.
