# CLAUDE.md — DreamTeam-2k26

## 1. Contexto obrigatório

@contexto.md

O arquivo `contexto.md` é a referência mestre para os requisitos, as decisões da equipe, a identidade visual, o escopo do MVP e o estado conhecido do projeto.

Antes de iniciar uma tarefa, consulte o contexto relevante e inspecione o código existente. Não presuma que informações antigas continuam atualizadas.

## 2. Stack tecnológica obrigatória

### Frontend

- **Vue 3**
- **JavaScript**, sem TypeScript.
- **Vite** para desenvolvimento e build.
- **CSS puro**, sem Tailwind CSS.
- Vue Router, Pinia, Axios, Lucide e Vue Toastify: usar apenas os que já constam no `package.json`. Confirme lá antes de importar qualquer biblioteca.

Regras do frontend:

- Não criar arquivos `.ts` ou `.tsx`.
- Não adicionar TypeScript, mesmo em novos componentes.
- Não instalar nem utilizar Tailwind CSS, nem classes utilitárias do Tailwind.
- Implementar estilos com CSS convencional, utilizando arquivos `.css`, estilos globais e componentes Vue conforme a arquitetura existente.
- Utilizar variáveis CSS para centralizar cores, espaçamentos, tipografia, bordas e demais tokens visuais.
- Criar componentes reutilizáveis e manter responsabilidades bem definidas.
- Utilizar a Composition API do Vue 3 conforme os padrões existentes.
- Priorizar interfaces responsivas, acessíveis e consistentes.
- Reutilizar dependências existentes antes de adicionar novas bibliotecas.

Não substituir a stack definida por React, Angular, TypeScript ou frameworks CSS utilitários.

### Padrão de código do frontend

A base é o **guia oficial do Vue** (https://vuejs.org/guide/ e o Style Guide: https://vuejs.org/style-guide/). O tutorial **Desenvolvimento Web** do prof. Eduardo da Silva (https://eduardo-da-silva.github.io/desenvolvimento-web/) é a referência didática onde coincide com o guia (Composition API, `<script setup>`, stores Pinia no estilo setup, views `XView`, rotas lazy, `<style scoped>`). Onde o tutorial diverge, vale o que está abaixo (props tipadas, erros relançados, nada de `alert`/`console.log` como tratamento). O código de `src/` (auth e layout) já segue este padrão: use-o como referência.

#### Arquitetura: pastas globais por tipo

- Fluxo de toda tela com dados: **View → Store → API** (`src/views/` → `src/stores/<entidade>.js` → `src/api/<entidade>.js`). Views e componentes **nunca** importam `src/api/` direto.
- **Exceção:** `src/features/chat/` (pasta por feature, `services/chatApi.js` retornando só `.data`, store com `ref`). Já funciona e tem testes; fica como está, mas código novo **não** copia esse formato.

| O quê | Onde | Nome |
|---|---|---|
| Página (rota) | `src/views/<area>/` | `XView.vue` (`ProjectListView.vue`) |
| Componente de domínio | `src/components/<dominio>/` | PascalCase, com o domínio no nome (`ProjectCard.vue`, `TaskDrawer.vue`) |
| Componente base de UI | `src/components/ui/` | prefixo `Base` (`BaseButton`, `BaseModal`) |
| Estrutura da página | `src/components/layout/` | `AppHeader`, `SideBar`, `NavItem` |
| Layout de rota | `src/layouts/` | `XLayout.vue` |
| Store Pinia | `src/stores/<entidade>.js` | `useXStore`, id `'xStore'` |
| Chamadas HTTP | `src/api/<entidade>.js` | funções `listX`, `getX`, `createX`, `updateX`, `deleteX` |
| Composable | `src/composables/` | `useX.js` |
| Funções puras | `src/utils/` | camelCase (`validators.js`) |
| Configuração do app | `src/config/app.js` | `appConfig` |

- Imports com alias `@/` (`import BaseButton from '@/components/ui/BaseButton.vue'`).

#### API (`src/api/<entidade>.js`)

```js
import api from './api'   // instância axios: baseURL, JWT e renovação de token já tratados

export function listProjects(params) {
  return api.get('/projects/', { params })
}

export function createProject({ name, description }) {
  return api.post('/projects/', { name, description })
}
```

- Funções nomeadas, uma por endpoint, retornando a **resposta do axios** (quem chama lê `.data`). Sem `try/catch` aqui: o erro sobe para a store.
- Use sempre a instância `api` de `src/api/api.js`; nunca `axios` direto nem URL fixa.
- Corpo da requisição montado com campos explícitos (não repasse objetos inteiros da tela).

#### Store (`src/stores/<entidade>.js`)

```js
export const useProjectStore = defineStore('projectStore', () => {
  const state = reactive({ projects: [], loading: false, error: '' })

  const projects = computed(() => state.projects)
  const loading = computed(() => state.loading)

  async function fetchProjects() {
    state.loading = true
    state.error = ''
    try {
      const response = await projectApi.listProjects()
      state.projects = response.data
    } catch (error) {
      state.error = error?.response?.data?.detail || 'Não foi possível carregar os projetos.'
      toast.error(state.error)
      throw error
    } finally {
      state.loading = false
    }
  }

  return { projects, loading, fetchProjects }
})
```

- Estilo setup com `state = reactive({...})`; o estado sai **somente leitura** por `computed` e só muda pelas actions.
- Toasts de sucesso/erro ficam **na action** (`toast.loading` + `toast.update` em operações demoradas, como em `stores/auth.js`). A action **relança** o erro; a view só decide navegação ou estado local.
- Mensagens de erro em português, priorizando `detail` e os erros de campo do DRF.

#### Componentes e views

- `<script setup>` (JavaScript), na ordem `<script>` → `<template>` → `<style scoped>`.
- Props com **objeto tipado** e destructure reativo; emits declarados (com validador quando o payload importa):

```js
const { loading = false } = defineProps({
  loading: { type: Boolean, default: false },
})

const emit = defineEmits({
  submit: (payload) => Boolean(payload?.name),
})
```

- Dados descem por props e sobem por eventos. `v-model` só para contrato de duas vias real (inputs, `BaseInput`).
- Derivações (filtros, contagens, progresso, atraso) em `computed`, nunca recalculadas no template. Lógica pura reutilizável vai para `src/utils/`.
- `v-for` sempre com `:key` estável (id); nunca `v-if` no mesmo elemento do `v-for`; não usar `v-html` com dado do usuário.
- Toda tela com dados trata **carregando, vazio, erro e sucesso**.
- Formulários usam **sempre** `useForm` + `@/utils/validators` + `BaseInput`/`BaseButton` e emitem `submit` com os valores (ver `LoginForm.vue`). A validação no front é só experiência de uso; o backend valida de verdade.
- Estilos do componente no próprio `<style scoped>` com classes (padrão `bloco__elemento--modificador`, como `nav-item--active`) e apenas tokens de `main.css`, sem hex.
- Ícones de `lucide-vue-next`; ícone decorativo com `aria-hidden="true"`, botão só com ícone com `aria-label`.

#### Router

- Rotas em `src/router/index.js`, com **nome em minúsculas/kebab** (`'home'`, `'project-detail'`) e views em lazy loading (`() => import(...)`).
- Navegação sempre por nome: `router.push({ name: 'project-detail', params: { id } })`.
- Página no menu: `meta.nav: { label, icon, order }` (lido por `useNavigation`). Rota protegida fica dentro do layout com `meta.requiresAuth`.
- Não criar item de menu para página que ainda não existe.

#### Testes, lint e formatação

- Lógica pura (`src/utils/`, cálculos de progresso/atraso, formatação) tem teste com `node --test` em `__tests__/<arquivo>.test.js` ao lado do código, sem dependência nova (como `src/features/chat/__tests__/`). Telas são validadas no navegador, nos dois temas.
- Prettier do projeto: sem ponto e vírgula, aspas simples, linha de 100 caracteres.
- Comentários e textos da interface em português.

### Backend

- **Python com Django**.
- Django REST Framework, SimpleJWT, PDM, Django Channels e Daphne: usar conforme já configurados no repositório. Confirme nos arquivos de dependências antes de utilizar.

Regras do backend:

- Seguir a arquitetura Django existente.
- Reutilizar models, serializers, viewsets e permissions existentes.
- Validar entradas e regras de negócio no backend.
- Aplicar autenticação e autorização em todas as operações protegidas.
- Respeitar o isolamento de dados entre projetos.
- Evitar duplicação de lógica e consultas desnecessárias.
- Criar ou atualizar testes para as funcionalidades modificadas.
- Não adicionar dependências sem necessidade justificada.
- Não migrar o backend para outro framework.

### Padrão de código do backend

Siga o padrão do tutorial **Django com DRF (2026)** do prof. Marco André (https://github.com/marrcandre/django-drf-tutorial). O código de `core/` (projetos, usuários) já segue esse padrão: use-o como referência.

#### Arquitetura: tudo no app `core`

- Código novo de domínio vai em `core/`. **Não crie apps Django novos** e **não crie camada de services**. (`chat/` e `uploader/` já existem separados; não mexa neles sem pedido.)
- Fluxo de toda API: **Model → Serializer → ViewSet → Router → URL**.
- Um arquivo por entidade em cada pasta, exportado no `__init__.py`:

| O quê | Arquivo | Exportar em |
|---|---|---|
| Model | `core/models/<entidade>.py` | `core/models/__init__.py` |
| Serializers | `core/serializers/<entidade>.py` | `core/serializers/__init__.py` |
| ViewSet | `core/views/<entidade>.py` | `core/views/__init__.py` |
| Permissão de objeto | `core/permissions.py` | — |
| Rota | `router.register(...)` em `app/urls.py` | — |
| Admin | `core/admin.py` | — |
| Testes | `core/tests/test_<entidade>_*.py` | — |

- Nos `__init__.py`, mantenha o estilo `from .x import A, B` (o ruff ignora esses arquivos; não rode `--fix` neles).

#### Model

- Classe no singular; campos no singular. `__str__` sempre.
- `ForeignKey` com `on_delete` pensado: `CASCADE` (filho some com o pai), `PROTECT` (bloqueia), `SET_NULL` + `null=True, blank=True` (histórico, ex.: `created_by`). Sempre `related_name`.
- Opções fixas com `models.TextChoices`/`IntegerChoices` dentro da model (ex.: `Membership.Role`).
- Unicidade com `Meta.constraints = [models.UniqueConstraint(...)]`.
- Datas: `created_at = DateTimeField(auto_now_add=True)`, `updated_at = DateTimeField(auto_now=True)`.
- Depois de mudar model: `pdm makemigrations` + `pdm migrate`.

#### Serializers: um por ação

```python
from rest_framework.serializers import CharField, ModelSerializer

class XListSerializer(ModelSerializer):          # list: só o que a tela de lista precisa
class XRetrieveSerializer(ModelSerializer):      # retrieve: tudo (pode usar depth ou serializers aninhados)
class XCreateUpdateSerializer(ModelSerializer):  # create/update: só campos graváveis
```

- `fields` sempre explícito (tupla); nada de `'__all__'` em código novo.
- Campo exibido mas não gravável: `read_only=True` (ex.: `CharField(source='usuario.email', read_only=True)`).
- Gravação em mais de uma tabela (ex.: projeto + membership do dono, itens aninhados): sobrescreva `create`/`update` no serializer com `@transaction.atomic`.
- Validação: `validate_<campo>` e `validate(self, attrs)`, levantando `ValidationError` com mensagem em português.
- Ação customizada com entrada própria: serializer dedicado (`Serializer`) para validar a entrada.

#### ViewSet

```python
class XViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated, XPermission]

    def get_queryset(self):            # SEMPRE restringe ao que o usuário pode ver
        ...

    def get_serializer_class(self):
        if self.action == 'list':
            return XListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return XCreateUpdateSerializer
        return XRetrieveSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)   # autor vem do token, nunca do corpo
```

- Exemplo real: `core/views/project.py`.
- Ações extras: `@action(detail=True|False, methods=[...])` + `@extend_schema(summary=..., request=..., responses=...)`.
- Filtros/busca/ordenação: `DjangoFilterBackend`, `SearchFilter`, `OrderingFilter` com `filterset_fields`, `search_fields`, `ordering_fields`, `ordering`.
- Rota: `router.register(r'<plural>', XViewSet, basename='<plural>')` em `app/urls.py`.

#### Autorização no backend (regra do Fluxo)

- Recursos de projeto são autorizados pela **participação** (`Membership`), não pelos grupos do Django: use `IsAuthenticated` + uma permissão de objeto em `core/permissions.py` (ex.: `ProjectRolePermission`) em vez do `ModelPermissions` padrão.
- `get_queryset` filtra pelos projetos do usuário: quem não participa recebe **404**; quem participa sem papel suficiente recebe **403**.
- Papéis: dono (`owner`), administrador (`admin`), membro (`member`). Ver `contexto.md`.
- Nunca confie em ids de autor/usuário vindos do frontend.

#### Admin

- `@admin.register(X)` com `list_display`, `search_fields`, `list_filter`, `ordering` quando fizer sentido.
- Filhos editáveis no pai com `TabularInline` (ex.: memberships dentro do projeto).

#### Testes do backend

- `APITestCase` em `core/tests/`, helpers em `core/tests/helpers.py` (`make_user`, `make_project`, `client_for`).
- Cubra: sem login (401), fora do projeto (404), papel errado (403), caminho feliz, validação (400).

## 3. CSS e identidade visual

A interface deve utilizar CSS puro, sem Tailwind CSS.

- Seguir a identidade visual oficial Sálvia & Marfim documentada em `contexto.md`.
- Implementar temas claro e escuro conforme os tokens definidos pela equipe.
- Centralizar as cores e os tokens em variáveis CSS reutilizáveis.
- Evitar valores hexadecimais repetidos diretamente nos componentes.
- Utilizar tipografia Inter.
- Preferir superfícies neutras, bordas suaves e sombras discretas.
- Evitar neon, gradientes exagerados e efeitos visuais excessivos.
- Garantir contraste, foco de teclado, rótulos acessíveis e responsividade.
- Não comunicar estados exclusivamente por cores.

**No Fluxo, o arquivo CSS global é `src/assets/main.css`.** Atualize-o em vez de criar outro arquivo com a mesma responsabilidade. Preserve os tokens já usados pelos componentes (`--color-primary`, `--color-background`, `--color-surface`, `--color-border`, `--header-height`, `--sidebar-width` etc.). Estilos específicos de um componente ficam no próprio componente.

## 4. Procedimento antes de implementar

1. Entender o objetivo e os critérios de conclusão (ler a issue, ver seção 10).
2. Consultar `contexto.md`.
3. Verificar a branch e as alterações locais com `git status` e `git diff`.
4. Inspecionar os arquivos relevantes.
5. Confirmar dependências e configurações.
6. Identificar impactos no frontend, backend e contratos da API.
7. Implementar a menor alteração coesa que resolva o problema.

Não inventar endpoints, campos, modelos ou funcionalidades sem verificar o código existente.

**O Arthur edita o código por conta própria entre sessões.** Modifique apenas as seções que a task pede e nunca desfaça, reescreva ou "limpe" alterações dele. Se uma edição dele conflitar com a task, avise em vez de sobrescrever.

## 5. Segurança e regras de negócio

- Aplicar permissões no backend, nunca somente na interface.
- Validar a participação e o papel do usuário no projeto antes de liberar dados ou operações.
- Respeitar as permissões de dono, administrador e membro.
- Proteger tarefas, comentários, arquivos, conversas, reuniões e demais recursos associados a projetos.
- Não confiar em identificadores enviados pelo frontend como prova de autorização.
- Não expor credenciais, tokens ou informações privadas.

## 5.1 Fluxo de git e entrega

O Arthur delega as operações de git ao Claude. A única etapa manual dele é a revisão do código antes de subir para a `main`.

1. Atualize a `dev` e crie a branch `Feat-XX` (XX = número da issue), **sempre** a partir da `dev`.
2. Nunca faça commit direto em `dev` ou `main` (branches protegidas).
3. Agrupe os commits por unidade lógica, no padrão `Feat#XX-[Ação realizada]`, também no backend (o prefixo `feat:`/`fix:` do tutorial não se aplica aqui).
4. Antes de qualquer push ou PR:
   - rode `npm run build` e os testes relevantes;
   - teste os fluxos afetados, inclusive nos dois temas quando houver mudança visual;
   - suba o localhost para o Arthur ver as mudanças.
5. **PARE e entregue**: URL local, resumo das mudanças e o que foi testado. Aguarde o OK explícito do Arthur.
6. Com o OK: faça o push, abra o PR para `dev` e mova a task para "In Review" no Kanban.
7. O OK vale apenas para aquela task. Não generalize para as seguintes.
8. O merge na `main` e a revisão final são do Arthur.

Nada de remoto (push, PR, mover card, comentários em issue) acontece antes do passo 5.

## 6. Prioridade do MVP

Consultar a seção de MVP em `contexto.md`.

Priorizar os fluxos obrigatórios de autenticação, projetos, convites, tarefas, Kanban, checklists, comentários, filtros, prazos, progresso e persistência segura.

Chat, reuniões e arquivos são diferenciais prioritários, mas não devem comprometer a entrega dos requisitos obrigatórios.

Não implementar funcionalidades explicitamente fora do MVP sem solicitação ou autorização.

## 7. Testes e validação

Após as alterações:

- Executar os testes relevantes disponíveis.
- Verificar o build do frontend quando aplicável.
- No frontend, antes de dizer que terminou, rodar: `npm run build`, `npx eslint <arquivos alterados>` e os testes `node --test` afetados (o `npm run lint` usa `--fix` no projeto inteiro: não use para não reformatar código de outros).
- No backend, antes de dizer que terminou, rodar: `pdm test` (suíte inteira), `pdm run python manage.py makemigrations --check --dry-run` e `pdm lint`.
- Validar endpoints, autenticação e permissões no backend.
- Verificar a integração entre frontend e backend.
- Conferir estados de carregamento, erro, sucesso e ausência de dados.
- Informar quais verificações foram executadas e seus resultados reais.

Não afirmar que uma funcionalidade funciona sem evidência.

## 8. Atualização da documentação

Quando uma tarefa modificar decisões arquiteturais, contratos da API ou funcionalidades importantes:

- Atualizar a documentação pertinente.
- Distinguir decisões confirmadas de propostas e pendências.
- Não registrar como concluído algo que não foi validado.
- Evitar reescrever todo o contexto para documentar alterações pequenas.

## 9. Formato da resposta final

Ao concluir uma tarefa (no portão de aprovação do passo 5.1), apresentar de forma curta:

- **Implementado:** resumo das alterações.
- **Arquivos alterados:** caminhos e respectivas finalidades.
- **Testes:** verificações executadas e resultados reais, com evidências.
- **Localhost:** URL para o Arthur conferir.
- **Pendências:** limitações ou decisões necessárias.

## 10. Ambiente e ferramentas

- Desenvolvimento no Windows com VS Code. Os comandos devem funcionar em PowerShell ou Git Bash; não use comandos exclusivos de Linux/macOS (como `rm -rf`) sem adaptar.
- Use o `gh` CLI para ler issues e o Project (Kanban) do repositório `DreamTeam-2k26`. Se faltar escopo, informe o comando de autenticação necessário (ex.: `gh auth refresh -s project`) em vez de tentar contornar.
- A fonte da verdade de cada task é a issue no GitHub (`gh issue view N`), não o texto colado no chat.
- Referências visuais (Figma) ficam em `docs\figma\task-N.png`. Leia a imagem antes de implementar a interface.
- Logo e assets do projeto ficam na pasta do hackathon. Use como referência de identidade visual.
- Skills padrão em todo o trabalho: superpowers e caveman.
- Os scripts de modelagem ficam em `modelagem\`.

## Regra de ouro

Entregar primeiro o fluxo obrigatório completo, respeitar a stack definida, preservar as decisões da equipe e as edições do Arthur, e verificar o código real antes de assumir qualquer coisa.