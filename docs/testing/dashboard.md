# Home/Dashboard — issue #29

A rota autenticada `/` usa a HomeView existente, o layout, a store de autenticação e os tokens do Fluxo. A branch Feat-29 foi criada a partir da dev atualizada.

## Dados e funcionalidades

- `listProjects` de `src/api/projects.js` é o mesmo serviço de Meus Projetos (#24). Percorre todas as páginas antes de publicar a lista e seus indicadores; uma falha intermediária não vira um total parcial.
- Os três projetos recentes são ordenados por `updated_at`, sem alterar a lista original. Projetos sem data ficam ao final.
- Os únicos indicadores agregados são o total de projetos e quantos têm papel `owner`/`admin`. Ambos usam a lista completa, inclusive projetos além da primeira página.
- `RecentProjects` reutiliza `ProjectCard` no modo compacto, preservando o comportamento padrão de Meus Projetos. Progresso e participantes só aparecem quando fornecidos pelo backend. Não há cálculo de tarefas ou porcentagens a partir de páginas parciais.
- `Novo projeto` reutiliza `ProjectForm`, `createProject` e os validadores existentes. Trata erros de campos e restaura o foco ao fechar. Após POST, revalida a lista; erro no GET não repete a criação.
- `Ver todos` aponta para Meus Projetos. Os cards reutilizam a rota `/projects/:id` e a tela de detalhes já integradas na dev pela #27, sem criar uma tela paralela.
- A saudação usa `useAuthStore`/`fetchUser`, com nome apenas quando disponível e fallback neutro se o perfil falhar. O layout e a Home compartilham o pedido de perfil pela store.
- Convites e ações de aceitar/recusar da referência não são exibidos: não há serviço/contrato correspondente disponível nesta base.
- Indicadores de produtividade e tarefas agregadas dependem da [issue backend #15](https://github.com/DreamTeam-2k26/backend/issues/15). Foram omitidos; a seção de visão rápida admite novos cartões quando houver dados suficientes.

## Estados e acessibilidade

- Carregamento anunciado por `role=status` e `aria-busy` com esqueletos decorativos.
- Erro com tentativa novamente, estado vazio com criação de projeto e aviso offline com criação bloqueada.
- Ao reconectar, a lista é revalidada automaticamente. Se houver dados anteriores, eles permanecem disponíveis com aviso explícito de última atualização; os dados não são persistidos como se estivessem atuais.
- Sem alterar App.vue, Sidebar, Header, autenticação ou barra mobile. Layout com tokens Light/Dark e grades responsivas.
- Formulário existente usa dialog modal nativo, foco inicial, Escape e retorno de foco ao disparador.

## Verificações

- `npm run build`
- `npx eslint src/views/HomeView.vue src/components/dashboard src/components/projects/ProjectCard.vue tests/dashboard`
- `npm run test:dashboard` (paginação completa, ordenação, contagens e renderização dos cartões sem métricas fictícias)
- `npm run test:projects` (regressão dos cards compartilhados e serviço paginado)

Fixture de navegador: `/tests/dashboard/browser.html`. Simula respostas da API no código de teste. Execute com `VITE_DASHBOARD_DEMO=false` para validar os cenários de integração. Suporta `scenario=success|error|empty|offline|profile-error`, `theme=dark` e `preview=1` para inspeção sem executar as ações de criação. O chat é desativado somente nessa fixture para não abrir WebSocket durante a verificação da Home.

A criação e consulta contra o backend real dependem de uma sessão válida e do servidor disponível; as verificações de navegador usam o contrato simulado descrito acima, sem inserir registros reais no banco.

## Demonstração em desenvolvimento

Por solicitação do usuário, a Home permanece populada com três projetos fictícios em `npm run dev`, com aviso de demonstração. Esses dados não são gravados no backend e não entram no fluxo de produção. Para consultar a API real em desenvolvimento, configure `VITE_DASHBOARD_DEMO=false` no ambiente local. A Home ocupa toda a largura disponível ao lado da sidebar.
