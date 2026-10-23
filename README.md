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
