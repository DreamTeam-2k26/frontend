# Brainstorm Inteligente — frontend (design)

**Data:** 24/10/2026 · **Branch:** `Feat-60` (a partir de `dev` em `15a806e`) · **Status:** aprovado na conversa.
**Backend:** Feat-52 (contrato em `backend/docs/superpowers/specs/2026-10-24-brainstorm-backend-design.md`).

## Navegação
- Seção `brainstorm` ("Brainstorm", ícone `Lightbulb`) em `src/config/projectNavigation.js` (sidebar + abas mobile).
  Lista em `project-detail?aba=brainstorm`; filtros na URL (`busca`, `categoria`, `status`, `ordem`).
- Rota `project-brainstorm-topic` (`/projects/:id/brainstorm/:topicId`), etapa em `?etapa=discussao|sintese|decisao`.
  `projectSectionFromRoute` devolve `brainstorm` nela.
- Atalho na Visão geral: contagem real de discussões abertas (`count` de `?status=open&page_size=1`).

## Arquitetura (View → Store → API)
- API: `src/api/brainstormTopics.js`, `src/api/brainstormReplies.js` (respostas do axios, sem try/catch).
- Stores: `useBrainstormListStore` (lista paginada, "Carregar mais", versão + AbortController) e
  `useBrainstormTopicStore` (tópico, respostas, análise, versões, tarefas/membros do projeto para a decisão; ações
  com toasts e erro relançado; trava contra clique duplo por ação).
- Utils puros (`src/utils/brainstorm.js`, testes em `src/utils/__tests__/brainstorm.test.js`): rótulos/opções,
  `buildThread`, `topicFlags`, `approvalPayload`, `normalizeListQuery`.

## Telas (componentes em `src/components/brainstorm/`)
- `BrainstormBoard` (aba): filtros, cards, vazio/erro/carregando, "Carregar mais", botão Nova discussão.
- `BrainstormTopicCard`, `BrainstormStatusBadge`, `BrainstormVoteControl`.
- `BrainstormTopicForm` (modal; `useForm`; criar e editar).
- `views/BrainstormTopicView.vue`: cabeçalho, ações por papel, etapas.
- `BrainstormReplyThread` / `BrainstormReplyItem` / `BrainstormReplyComposer`.
- `BrainstormAnalysisPanel` (estados, fontes `#R<id>` clicáveis, "Sugestão da IA", duplicatas, histórico por ciclo).
- `BrainstormDecisionEditor` (dono/admin): texto, justificativa, cards selecionáveis/editáveis ou vínculo a tarefa
  existente, confirmação, POST único, links para `project-kanban?task=<id>`; decisão vigente e "Em revisão".

## Regras
- Ações de gestão só para `project.role` owner/admin (o backend decide de fato; 403 vira toast).
- Excluir tópico só se `replies_count === 0`, sem votos e sem análise/decisão; caso contrário, Arquivar.
- Encerrada/arquivada: sem composer e sem voto ativo.
- 404/401/erro com retentativa; Light/Dark só com tokens; mobile; teclado/aria.
- Fora do escopo: polling/WebSocket, notificações, histórico global.
