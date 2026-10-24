# Frontend #45 — configurações do projeto

Branch: `Feat-45`, criada de `origin/dev`. PR parcial para `dev`, com `Refs #45`.

## Implementado

- Rota `/projects/:id/settings` e item contextual ativo. O botão adicional na tela do projeto foi removido a pedido; no mobile, o acesso direto à rota funciona, mas o atalho visual continua pendente. `/settings` continua pessoal e settings não entra em `projectTabs`.
- GET de informações e papel, PATCH de nome/descrição, DELETE confirmado do dono e POST de saída confirmado de admin/member.
- Papel exclusivamente do GET, revalidação após edição e 401/403/404; sem controles de edição para member. Dono recebe orientação e atalho para Participantes antes de sair.
- Loading, retry, erros por campo, rede, troca de ID e bloqueio de dupla submissão. A resposta de escrita não fornece autorização.
- Eventos existentes de atualização do nome e evento de remoção do contexto, com cancelamento de GET pendente na sidebar. A lista de projetos é revalidada por `projects:changed` e ao montar após redirecionamento.
- Configurações pessoais com Perfil, controle de tema existente e Sair da conta, reutilizando o logout do perfil.

## Ajustes visuais

- Configurações compactas e centralizadas, com seta no link Meus Projetos.
- Tema escuro com fundos pretos, textos claros e detalhes verdes em ações, navegação, foco e hover dos cards. Tema claro preservado.
- Nenhuma nova animação de entrada foi implementada; os hovers usam transições curtas.

## Validação executada

- `npm run test:projects`: 37 testes aprovados, incluindo navegação de settings entre IDs e ausência de aba vazia.
- `npm run lint` e `npm run build`.
- `node tests/projects/settings-browser.mjs`: validação no Chrome headless com o layout real e adapter Axios controlado, sem alterar o backend. Verifica owner/admin/member, nome obrigatório, PATCH único, sidebar sem F5, 400 por campo, 401, 403 com perda de papel, falha de rede, saída 404 sem falso sucesso, saída 204 e limpeza de contexto, resposta atrasada ao trocar ID, cancelamento sem DELETE, confirmação e DELETE único, foco/Escape, largura mobile, atalhos pessoais e logout com limpeza dos tokens.
- Capturas com dados fictícios: [desktop claro](desktop-light.png), [mobile escuro](mobile-dark.png).

Para repetir o navegador, execute a partir da raiz do frontend:

```sh
npm run dev -- --host 127.0.0.1 --port 5178
google-chrome --headless --disable-gpu --remote-debugging-port=9229 --user-data-dir=/tmp/feat45-chrome about:blank
node tests/projects/settings-browser.mjs
```

O roteiro acessa `/tests/projects/settings-browser.html`, substitui o adapter apenas naquela página de desenvolvimento e grava as capturas acima. Use um perfil descartável do navegador: o harness grava um token fictício no storage desse perfil. Os arquivos de teste não são entradas do build de produção. Os cenários controlados não comprovam autorização no servidor.

## Pendência obrigatória: Backend #46

O checkout local de `backend/core/views/project.py`, inspecionado durante a implementação, não possui a action de saída. A chamada implementada é exclusivamente `POST /projects/{id}/leave/`; não há fallback de exclusão de Membership. Não encerrar #45 nem usar `Closes #45` até integrar e testar o endpoint real.

Ainda validar com backend integrado e contas reais de owner/admin/member e uma conta sem participação:

1. Abrir diretamente `/projects/:id/settings`, recarregar com F5, alternar IDs rapidamente e conferir informações/role do GET. Projeto alheio deve apresentar 404, sem formulário.
2. Editar nome/descrição como owner/admin e conferir PATCH, sidebar e lista. Testar nome vazio, acima de 100 caracteres, erro por campo e mudança de papel em outra sessão. Member deve consultar sem edição; servidor deve negar PATCH forçado.
3. Como owner, cancelar exclusão e verificar ausência de DELETE; confirmar em um projeto descartável e verificar remoção real, lista revalidada e sidebar sem contexto. Como admin/member, servidor deve negar DELETE forçado.
4. Owner não tem saída funcional. Como admin/member, cancelar e confirmar saída; verificar POST real com 204, perda de acesso e 404 na repetição. POST forçado de owner deve retornar 403. Em falha, permanecer na tela e permitir recuperação.
5. Abrir Participantes/Convites e conferir as permissões já existentes. Testar desktop/mobile, Light/Dark, Tab, Shift+Tab, Enter e Escape; confirmar foco preso no modal e devolvido ao gatilho ao cancelar.
6. Testar perda de rede, expiração/renovação real de sessão e resposta atrasada durante PATCH/DELETE/saída ao trocar de rota. O harness cobre mensagens de 401 no componente, sem substituir o teste real de renovação da sessão.
