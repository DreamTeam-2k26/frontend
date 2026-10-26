# Fluxo · Frontend

Frontend do **Fluxo**, uma plataforma de gestão de projetos em equipe desenvolvida pela equipe [DreamTeam-2k26](https://github.com/DreamTeam-2k26) para o hackathon de 2026.

🔗 **Aplicação:** [fluxo-beige-three.vercel.app](https://fluxo-beige-three.vercel.app) · **Backend:** [DreamTeam-2k26/backend](https://github.com/DreamTeam-2k26/backend)

## Funcionalidades

- **Projetos:** criação, configurações, membros e convites por link
- **Quadro Kanban:** tarefas com responsável, descrição, comentários e anexos, movidas entre colunas
- **Chat e chamadas** em tempo real (WebSocket)
- **Pastas e arquivos** do projeto
- **Brainstorm** por tópicos
- **Dashboard, calendário, atividades e links** do projeto
- **Autenticação** com JWT e login com Google
- Perfil de usuário com foto

## Tecnologias

- Vue 3 + Vite
- Pinia
- Vue Router
- Axios
- GSAP e Motion (animações)
- Lucide Icons
- vue3-toastify
- Testes com o test runner nativo do Node (`node --test`)
- Oxlint, ESLint e Prettier
- Deploy na Vercel

## Como rodar

```bash
git clone https://github.com/DreamTeam-2k26/frontend.git
cd frontend
npm install
cp .env.example .env
npm run dev
```

A aplicação sobe em `http://localhost:5173`. O backend precisa estar rodando (veja o [README do backend](https://github.com/DreamTeam-2k26/backend)).

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL da API com `/api` (HTTPS em produção) |
| `VITE_ACCESS_TOKEN_KEY` | Chave do access token no armazenamento local |
| `VITE_REFRESH_TOKEN_KEY` | Chave do refresh token no armazenamento local |
| `VITE_GOOGLE_CLIENT_ID` | Client ID público do OAuth do Google (o mesmo `GOOGLE_CLIENT_ID` do Django) |

> Nunca coloque `client_secret` ou chaves privadas em variáveis `VITE_*`: elas vão para o bundle público.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Pré-visualiza o build |
| `npm run lint` | Oxlint + ESLint com correção automática |
| `npm run format` | Formata `src/` com Prettier |
| `npm run test:<módulo>` | Testes por módulo: `kanban`, `projects`, `chat`, `calls`, `members`, `folders`, `files`, `calendar`, `dashboard`, `activities`, `links`, `google` |

## Estrutura

```
src/
├── api/ e services/   # Comunicação com a API
├── components/        # Componentes reutilizáveis
├── composables/       # Lógica reutilizável
├── features/          # Módulos maiores (chat, calls)
├── layouts/           # Layouts das páginas
├── router/            # Rotas
├── stores/            # Stores Pinia
├── views/             # Telas (Projetos, Kanban, Membros, Pastas, Brainstorm, Perfil...)
└── utils/
tests/                 # Testes por módulo
docs/                  # Design e documentação de issues
```

## Equipe

Desenvolvido pela equipe **DreamTeam-2k26**. As tarefas são organizadas no Kanban e nas issues do GitHub, com uma branch por issue e pull requests revisados antes do merge.
