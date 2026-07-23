# O Arquivo de Londres — v2 (estrutura modular)

Esse pacote é a refatoração do `index.html` monolítico (5419 linhas, tudo
em um arquivo só) para um projeto Vite com CSS e JS separados por domínio.
**Nenhuma lógica foi reescrita** — as 118 funções do app original foram
extraídas e realocadas função por função, então o comportamento deve ser
idêntico ao site atual. O que mudou é só a organização dos arquivos.

## Estrutura

```
index.html              shell único com todo o HTML (mantido como pediu)
src/
  style.css              todo o CSS que estava em <style>
  main.js                entrypoint: importa os módulos e cola no window
  app.js                 bootstrap (init, login gate, setup obrigatório de perfil)
  lib/
    supabaseClient.js     cliente sb + constantes (URL, chave, email do Guardião, limite de personagens)
    store.js               estado compartilhado (currentUser, myCharacters, allCampaigns, etc.)
    utils.js               escapeHtml, showToast, defaultAvatarSvg
  auth/auth.js             login, registro, logout, mensagens de erro
  nav/nav.js                showPage, menu mobile
  characters/characters.js  CRUD de investigadores, avatar, upload de PDF
  campaigns/campaigns.js    CRUD de campanhas, listagem, detalhe, roster
  sheet/
    sheetStore.js           estado compartilhado só entre wizard e viewer
    sheetWizard.js           os 5 passos da ficha CoC
    sheetViewer.js           visualização estilo PDF, vitals, perícias, companheiros
  profile/profile.js        perfil do jogador (bio, avatar, capa)
  players/players.js        grid de membros + modal de perfil público
  notes/notes.js            anotações de campo por campanha
  guardian/guardian.js      painel do Guardião
  tutorial/tutorial.js       tour guiado + checklist (cópia quase 1:1 do original)
```

## Por que ficou assim

- **`store` / `sheetStore`**: no original, o app usava variáveis `let` soltas
  no topo do `<script>` (ex: `let currentUser = null;`). Módulos ES não
  compartilham escopo, então isso virou um objeto único importado por
  referência (`store.currentUser`) — qualquer arquivo que importar `store`
  lê e escreve o mesmo estado. `sheetStore` existe à parte porque só
  wizard e viewer de ficha precisam compartilhar isso (referências de
  perícia/ocupação, personagem atual da visualização).
- **`window`**: o HTML ainda chama tudo via `onclick="funcao(...)"` (não
  migramos pra `addEventListener` — isso é o próximo passo natural, mas é
  uma mudança maior e achei melhor não misturar com a separação de arquivos).
  Como módulos ES não jogam nada no escopo global, o `main.js` importa
  cada módulo como namespace e faz `Object.assign(window, Modulo)`. Isso
  preserva 100% dos `onclick` do HTML sem precisar editar um por um.
- **`sheetWizard.js` ↔ `sheetViewer.js`**: import circular intencional
  (wizard chama `openSheetViewer` ao terminar de editar; viewer chama
  `openSheetWizard` ao clicar em editar). ESM lida bem com isso desde que
  o uso aconteça dentro de função, não no topo do módulo — é o caso aqui.

## Rodando local

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # gera dist/
npm run preview   # serve o build de produção localmente
```

## Deploy no Vercel

O projeto já builda limpo com `vite build` → `dist/`. No painel do Vercel:

1. Import do repo GitHub `coc-campanha` normalmente.
2. Framework preset: **Vite** (o Vercel detecta sozinho pelo `package.json`).
3. Build command: `vite build` (default) — Output directory: `dist` (default).
4. Nenhuma env var é necessária: a URL e a chave pública do Supabase estão
   em `src/lib/supabaseClient.js` (são a chave `publishable`, então tudo
   bem ela estar no bundle do client, é o mesmo padrão do site atual).

Só isso — não precisa mexer em domínio nem em nada do Supabase (schema,
policies, storage continuam exatamente iguais).

## O que NÃO mudou (de propósito)

- Nenhuma policy, tabela ou storage do Supabase foi tocada.
- Nenhuma função foi reescrita ou "melhorada" — é extração pura, pra você
  poder revisar/comparar com o `index.html` antigo função por função se
  quiser.
- O HTML continua em um arquivo só (`index.html`), como você pediu.

## Próximos passos sugeridos (não feitos aqui)

- Trocar os `onclick=""` inline por `addEventListener` — hoje funciona
  via `window`, mas é um remanescente do modelo antigo.
- Separar o `index.html` em templates por página, se um dia quiser.
- Resolver os blocos `PROVISÓRIO` do `schema.sql` (characters/notes) —
  combinamos deixar isso de fora desta rodada.
