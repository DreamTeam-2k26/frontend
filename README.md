# .

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Tema claro e escuro

O controle na área de ações do Header alterna os temas existentes em `main.css`.
Na primeira visita, sempre inicia no tema claro (não segue `prefers-color-scheme`).
A escolha explícita é salva em `localStorage` na chave `fluxo-theme` e vale nas
próximas visitas. O tema claro remove `data-theme` da raiz;
o escuro aplica `data-theme="dark"`.

`public/theme-init.js` roda de forma síncrona no `<head>`, antes do CSS e do Vue,
para restaurar o tema antes da primeira pintura. Se o storage estiver bloqueado,
a alternância continua funcionando na sessão, sem persistência após recarregar.
Para voltar ao padrão (claro), remova a chave `fluxo-theme` e recarregue.

`ThemeToggle.vue` e `useTheme.js` podem ser reutilizados em outras telas. A integração
usa o slot `actions` do Header em `DefaultLayout.vue`, preservando o componente
AppHeader e a lógica da Sidebar para as respectivas tasks.

## Salas de Projeto (chat em tempo real)

Funcionalidade em `src/features/chat/` (rota `/chat`, exige login). Conversa com o app Django `chat` do backend por REST (`/api/chat/`) e por **um** WebSocket por aba (`/ws/chat/`), sempre com o JWT do sistema principal.

- `lib/` — lógica pura, sem Vue: `chatState.js` (aplica os eventos do servidor), `socketClient.js` (reconexão com backoff, tratamento do código 4401), `urls.js`, `format.js`, `errors.js`.
- `stores/chat.js` — store Pinia que liga API, WebSocket e estado.
- `components/`, `views/ChatView.vue` — interface (lista de salas, conversa, anexos, participantes, nova sala).
- `api/api.js` renova o token expirado (401) uma vez e repete a requisição; `api/session.js` faz a renovação.

Variáveis de ambiente: veja `.env.example` (`VITE_API_URL` precisa apontar para a API; a origem do WebSocket é derivada dela).

Testes da lógica pura (não precisam de `npm install`):

```sh
npm run test:chat
```
