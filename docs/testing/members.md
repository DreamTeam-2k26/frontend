# Participantes e convites — #27

## Ambiente

Usar VITE_API_URL apontando para um backend com memberships e invites habilitados e migrações aplicadas. Para revisão local da Home, configurar VITE_DASHBOARD_DEMO=false: a demonstração da #29 não consulta projetos reais. Nenhuma credencial ou token de teste faz parte do commit.

## Revisão manual reproduzível

1. Na conta A, criar um projeto em Meus Projetos e abrir Ver participantes na visão geral.
2. Em Convidar membro, buscar o e-mail completo de uma conta B cadastrada, confirmar a pessoa e enviar o convite. O convite aparece no Fluxo; não há envio de e-mail.
3. Na conta B, acessar Início, aceitar em Convites recebidos e abrir o projeto. Conferir a participação na lista e após F5/novo login. Repetir com Recusar em outro convite.
4. Como dono, promover/rebaixar B, remover um participante e transferir propriedade, verificando as confirmações e as permissões após cada resposta. Administrador só convida como membro e só remove membros; membro não administra convites.
5. Gerar um link real, copiar e abrir em outro navegador sem sessão. Alternar login/cadastro, autenticar e confirmar Entrar no projeto. Repetir com outra conta: o link continua utilizável e a mesma conta não ganha participação duplicada.
6. Revogar o link no gerenciamento e tentar resgatá-lo. Repetir com validade expirada, token inválido, convite duplicado e projeto alheio/inexistente.
7. Conferir busca local, contagem, atualização sem F5, offline/reconexão, Escape e retorno de foco do modal, menu por teclado, mobile e temas Light/Dark.

## Testes automatizados

- `npm run test:members`: permissões, busca, estados de convite, redirecionamento seguro, erros e paginação.
- `npm run test:projects`, `npm run test:dashboard`, `npm run test:chat`: regressões existentes.
- `npm run lint`, `npm run build`, `git diff --check`.
- `node tests/members/real-api.mjs`: integração opt-in com backend real em `http://127.0.0.1:8001/api/` ou FLUXO_TEST_API. **Usar somente banco isolado de teste**; cria contas/projetos e salva sessões privadas em /tmp/fluxo27-sessions.json.
- `node tests/members/browser.mjs`: Chrome instalado, frontend em `http://127.0.0.1:5181` ou FLUXO_TEST_FRONTEND, ligado ao mesmo backend. Requer a fixture anterior, que deve ser recriada antes de repetir o cenário. Capturas em /tmp/fluxo27-screenshots, sem campos de token visíveis.
- `node tests/members/pagination-api.mjs`: opt-in, cria 101 contas e convites no banco de teste para validar volume, concorrência e desatribuição de tarefa após remoção.

## Evidências e pendências desta entrega

Passaram lint, build, testes unitários de participantes, projetos, dashboard e chat. A integração com backend real passou para busca exata, convite direto, recebidos, aceite/recusa, duplicidade, papéis, permissões, link reutilizável, revogação, expiração real, transferência, remoção e persistência após novo login. Backend local usado: commit 88125f0c5c31a8de8b9bfa7fa59b9d2a5de994c6, migrações aplicadas em SQLite isolado em /tmp.

A validação automatizada de navegador parou no carregamento do formulário de login; não confirmou o fluxo visual completo e não produziu capturas de aceite desktop/mobile. A investigação e os testes restantes foram dispensados pelo solicitante antes da abertura do PR. O teste de volume real e de impacto em tarefas foi preparado, mas não concluído. Os testes de paginação unitários passaram; isso não substitui a execução de volume contra a API.

O backend não oferece consulta pública de detalhes do token. Por isso, a tela pública pede confirmação genérica e só descobre o projeto/papel após o resgate autenticado. Nenhum aceite é automático.

A entrega segue para revisão com essas pendências explícitas, sem declarar concluídos os critérios ponta a ponta da issue. Não foi validado deploy remoto nem equivalência de migrações/permissões do ambiente publicado.
