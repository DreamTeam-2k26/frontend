# Meus Projetos — issue #24

Rota autenticada: `/projects`. A navegação usa `meta.nav`; a página de exemplo continua em `/example`, fora do menu para manter os cinco itens da navegação mobile.

## Contrato e integração

- A instância Axios existente já fornece a base `/api`, JWT e renovação da sessão.
- GET `/projects/` usa `page_size=100` e percorre `total_pages` da paginação global do backend. A busca por nome usa a lista completa.
- POST `/projects/` e PATCH `/projects/{id}/` enviam apenas `name` e `description`.
- Após salvar, a lista é atualizada e revalidada via GET. Falha nessa revalidação permite tentar novamente sem repetir a escrita.
- Owner/admin podem abrir edição; o backend continua responsável por autorizar as operações.
- O acesso interno está desabilitado com explicação, pois não existe rota de detalhes na dev. A task da tela interna deve conectar esse botão à rota real ao entregá-la.
- A listagem retorna `progress` (0–100), `total_memberships` e `memberships` (`id` e `profile_picture`). Os cards exibem barra de progresso, total real e até três fotos sobrepostas, com indicador dos demais participantes. Fotos relativas usam a origem da API; ausência ou falha de imagem usa ícone neutro, pois nomes/iniciais não fazem parte desse contrato.
- POST/PATCH continuam retornando apenas os dados básicos: a revalidação via GET fornece as métricas. Enquanto indisponíveis, elas não são simuladas como zero.

## Verificação automatizada executada

- `npm run build`
- `npm run lint`, `npx oxlint .` e `npx eslint .`
- `npm run test:chat`
- `npm run test:projects`: busca por nome/todos os papéis, mensagens 400/401/403/404/rede, validação de campos, múltiplas páginas e falha em página intermediária; renderização dos cards com métricas, fotos e permissões.

## Validação manual pendente

O ambiente de execução negou a abertura da porta do Vite (`listen EPERM`) e a inicialização do Chrome. A validação visual no navegador permanece pendente. Na preparação do banco SQLite local, foram aplicadas as migrações pendentes e adicionados três projetos de demonstração às contas existentes. GET, POST e PATCH foram validados via APIClient com JWT e banco real; os projetos temporários de verificação foram revertidos. As contas e senhas existentes foram preservadas, e nenhum seed foi incluído no código do backend.

Com frontend e backend disponíveis, verificar:

- [ ] Login e navegação para Meus Projetos; acesso anônimo redireciona ao login.
- [ ] Listagem real para owner, admin e member, inclusive mais de 100 projetos.
- [ ] Busca com nome parcial, caixa diferente, nenhum resultado e limpeza.
- [ ] Criação com nome obrigatório, limite de 100 caracteres e descrição opcional.
- [ ] Edição owner/admin, dados preenchidos e atualização sem recarregar; member sem Editar.
- [ ] Validação 400 junto aos campos, 403/404 preservando formulário e sessão expirada pelo fluxo existente.
- [ ] Carregamento lento, lista vazia, erro de rede e tentativa novamente; falha no GET após escrita não repete POST/PATCH.
- [ ] Escape, Tab/Shift+Tab, foco inicial no nome e retorno ao botão que abriu o modal; ações bloqueadas durante envio.
- [ ] Progresso 0%, parcial e 100%, total singular/plural, fotos relativas/absolutas, participantes sem foto e imagem quebrada; mais de três participantes.
- [ ] Mobile 320px e desktop, textos longos, descrição multilinha e troca de tema Light/Dark.
- [ ] Início, Exemplo por URL, chat e configurações continuam funcionando.
