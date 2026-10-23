# Meus Projetos — issue #24

Rota autenticada: `/projects`. A navegação usa `meta.nav`; a página de exemplo continua em `/example`, fora do menu para manter os cinco itens da navegação mobile.

## Contrato e integração

- A instância Axios existente já fornece a base `/api`, JWT e renovação da sessão.
- GET `/projects/` usa `page_size=100` e percorre `total_pages` da paginação global do backend. A busca por nome usa a lista completa.
- POST `/projects/` e PATCH `/projects/{id}/` enviam apenas `name` e `description`.
- Após salvar, a lista é atualizada e revalidada via GET. Falha nessa revalidação permite tentar novamente sem repetir a escrita.
- Owner/admin podem abrir edição; o backend continua responsável por autorizar as operações.
- O acesso interno está desabilitado com explicação, pois não existe rota de detalhes na dev. A task da tela interna deve conectar esse botão à rota real ao entregá-la.
- Progresso, avatares e quantidade de participantes não são retornados pelo contrato e não foram simulados.

## Verificação automatizada executada

- `npm run build`
- `npm run lint`, `npx oxlint .` e `npx eslint .`
- `npm run test:chat`
- `npm run test:projects`: busca por nome/todos os papéis, mensagens 400/401/403/404/rede, validação de campos, múltiplas páginas e falha em página intermediária.

## Validação manual pendente

O ambiente de execução negou a abertura da porta do Vite (`listen EPERM`) e a inicialização do Chrome. A API local em `localhost:8000` não respondeu. Portanto não foi possível validar visualmente nem executar operações autenticadas contra o backend real.

Com frontend e backend disponíveis, verificar:

- [ ] Login e navegação para Meus Projetos; acesso anônimo redireciona ao login.
- [ ] Listagem real para owner, admin e member, inclusive mais de 100 projetos.
- [ ] Busca com nome parcial, caixa diferente, nenhum resultado e limpeza.
- [ ] Criação com nome obrigatório, limite de 100 caracteres e descrição opcional.
- [ ] Edição owner/admin, dados preenchidos e atualização sem recarregar; member sem Editar.
- [ ] Validação 400 junto aos campos, 403/404 preservando formulário e sessão expirada pelo fluxo existente.
- [ ] Carregamento lento, lista vazia, erro de rede e tentativa novamente; falha no GET após escrita não repete POST/PATCH.
- [ ] Escape, Tab/Shift+Tab, foco inicial no nome e retorno ao botão que abriu o modal; ações bloqueadas durante envio.
- [ ] Mobile 320px e desktop, textos longos, descrição multilinha e troca de tema Light/Dark.
- [ ] Início, Exemplo por URL, chat e configurações continuam funcionando.
