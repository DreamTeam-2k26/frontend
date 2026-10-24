# Gerenciador de pastas — issue #36

## Entrega

- Branch `Feat-36`, criada a partir da `origin/dev` (`9db493f`).
- Atalho **Pastas do projeto** na tela interna existente (#26).
- Rotas autenticadas `/projects/:id/folders` e `/projects/:id/folders/:folderId`.
- Breadcrumb e pasta anterior calculados pelo detalhe real da pasta (`path`, `parent`), inclusive ao abrir URL direta.
- Listagem de todos os resultados do local atual, com paginação de até 100 por chamada, preservando a ordenação do backend.
- Busca somente nas pastas do local aberto, com limpeza e estado sem resultados.
- Criar/renomear usando nome obrigatório, até 100 caracteres, validação local de colisão e mensagens da API.
- Mover usando seletor navegável de destino (inclusive raiz), bloqueando a própria pasta e seus descendentes. O backend continua validando ciclos, colisões e projetos.
- Excluir exige confirmação explícita e informa a remoção permanente de todas as subpastas descendentes. O detalhe é revalidado antes da confirmação.
- Após cada escrita, a lista e o detalhe atual são recarregados: contagem de subpastas e breadcrumb vêm novamente da API.
- Requisições antigas são abortadas/ignoradas nas mudanças de projeto/pasta. Operações bloqueiam envios repetidos e mantêm o formulário em caso de erro.
- Diálogos nativos com foco contido, Escape quando não há envio em andamento, labels e retorno de foco.
- Sem endpoints, contagens ou upload de arquivos. Sem mudanças no layout global/autenticação/backend.

## API consumida

A base `/api/` já é configurada na instância Axios existente; o serviço usa apenas `/folders/`.

| Operação        | Requisição                                                          |
| --------------- | ------------------------------------------------------------------- |
| Raiz            | GET `/folders/?project=ID&parent__isnull=true&page=N&page_size=100` |
| Subpastas       | GET `/folders/?project=ID&parent=FOLDER_ID&page=N&page_size=100`    |
| Caminho/detalhe | GET `/folders/ID/`                                                  |
| Criar           | POST `/folders/` com `{project, parent: ID ou null, name}`          |
| Renomear        | PATCH `/folders/ID/` com `{name}`                                   |
| Mover           | PATCH `/folders/ID/` com `{parent: ID ou null}`                     |
| Excluir         | DELETE `/folders/ID/`                                               |

Além do filtro da API, o serviço rejeita respostas de projeto ou pai diferente. Todos os papéis participantes podem operar; não há restrição visual a owner/admin.

## Testes automatizados

- `npm run test:folders`: 13 testes de serviço/paginação, payloads de CRUD, isolamento, nome duplicado/limite, URL, busca local, ciclos, breadcrumb renderizado, labels, formulário bloqueado e respostas obsoletas.
- `npm run test:projects`: 20 testes existentes passaram.
- `npm run test:chat`: 5 arquivos de testes existentes passaram.
- `npm run lint`, `npx oxlint .`, `npx eslint .` e `npm run build`.

## Integração real com banco persistente

`tests/folders/real-api.mjs` usa o mesmo `createFolderClient` do frontend, com adaptador de transporte para as views reais do Django via APIClient e autenticação JWT. Cada chamada roda em um processo novo e lê o SQLite persistente; não simula respostas da API. O helper `django_bridge.py` serve apenas ao teste e não integra o backend.

O teste exige uma cópia do backend atualizado e SQLite descartável em `/tmp`, impedindo o uso acidental do banco local de desenvolvimento. A cópia validada veio de `origin/dev` do backend (`de3c137`); o repositório e banco de desenvolvimento permaneceram intactos.

Preparação (ajuste os caminhos de Python e dependências locais):

```bash
# No repositório do backend:
mkdir -p /tmp/fluxo36-backend
git archive origin/dev | tar -x -C /tmp/fluxo36-backend
# Com as dependências Python do backend disponíveis:
cd /tmp/fluxo36-backend
DEBUG=True DATABASE_URL=sqlite:////tmp/fluxo36-api.sqlite3 python manage.py migrate --noinput

# No repositório do frontend:
FLUXO_TEST_BACKEND=/tmp/fluxo36-backend \
FLUXO_TEST_DATABASE_URL=sqlite:////tmp/fluxo36-api.sqlite3 \
FLUXO_TEST_PYTHON=/caminho/do/python \
FLUXO_TEST_PYTHONPATH=/caminho/__pypackages__/3.14/lib \
node tests/folders/real-api.mjs
```

O fluxo verifica: projeto criado pela API → pasta raiz → subpasta → terceiro nível → detalhe → renomear → mover com descendentes → mover à raiz → excluir em cascata; colisões e ciclos; destino em outro projeto; participação owner/admin/member; usuário externo 404 e anônimo 401; e listagem com 107 pastas em múltiplas páginas. Leituras posteriores às escritas usam processos novos, verificando persistência e reconstrução do caminho.

## Validação de navegador pendente

Este ambiente negou a abertura da porta do Vite (`listen EPERM 127.0.0.1:5182`) e a inicialização do Chrome (`setsockopt: Operation not permitted`, SIGTRAP). Portanto não foram produzidos prints desktop/mobile nem foi alegado teste visual ou F5 no navegador.

Com os servidores disponíveis, conferir antes do merge:

- [ ] Abrir pelo atalho de um projeto e pela URL direta de uma subpasta; F5 e Voltar/Avançar preservam a localização.
- [ ] Criar, renomear, mover para outra pasta, mover à raiz e excluir com confirmação, em owner/admin/member.
- [ ] Navegar rapidamente entre pastas e dois projetos sem exibir dados antigos.
- [ ] Pasta removida em outra sessão e revogação de acesso geram erro, sem falso sucesso.
- [ ] Formulário mantém o nome após falha de rede, bloqueia cliques repetidos e permite tentar novamente.
- [ ] Tab/Shift+Tab, Escape, foco inicial e retorno de foco; seleção de destino por teclado.
- [ ] Desktop, tablet, mobile 320px, nomes longos e árvore profunda; Light/Dark e contraste.
- [ ] Capturar e anexar prints reais desktop/mobile ao PR.
