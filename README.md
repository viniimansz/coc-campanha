# O Arquivo de Londres

Site para a campanha de *Chamado de Cthulhu* (RPG de mesa) que eu mestro com meus amigos. Cada jogador tem conta própria, cria investigadores, preenche a ficha passo a passo e acompanha as notas das sessões. O Guardião (mestre) tem um painel para organizar campanhas e personagens.

> *A tabletop RPG companion site for a Call of Cthulhu campaign: player accounts, guided character sheets, session notes and a game-master panel. Vanilla JS + Vite on the front end, Supabase (Postgres, Auth, Storage, RLS) on the back end.*

**No ar:** https://coc-campanha.vercel.app

## O que o site faz

- **Contas de jogador** com perfil (nome, apelido, bio, avatar e capa) e recuperação de senha por email
- **Investigadores**: até 10 por jogador, com avatar e ficha em PDF
- **Ficha guiada em 5 passos** (atributos, ocupação, perícias, armas e antecedentes), com cálculo automático de PV, PM, Sanidade, Movimento e Bônus de Dano
- **Visualização da ficha** no estilo do livro, com rolagem de testes de perícia
- **Campanhas** com capa, lista de investigadores e notas de sessão
- **Painel do Guardião**: criar e editar campanhas, mover personagens entre campanhas e abrir as fichas de todos
- **Tutorial guiado** para quem entra pela primeira vez

## Tecnologias

| Parte | Escolha |
|---|---|
| Front-end | HTML, CSS e JavaScript puro (módulos ES), empacotado com **Vite** |
| Back-end | **Supabase**: Postgres, Auth (email e senha) e Storage |
| Segurança | Row Level Security em todas as tabelas, upload restrito à pasta do próprio usuário, textos escapados antes de entrar no HTML |
| Hospedagem | **Vercel** (publica sozinho a cada push na `main`) |

## Estrutura

```
index.html                 todas as telas (login, app, modais)
src/
  main.js                  entrada: importa os módulos e expõe as funções no window
  app.js                   inicialização, sessão e setup obrigatório de perfil
  lib/                     cliente Supabase, estado compartilhado e utilitários (esc, safeUrl)
  auth/                    login, cadastro e recuperação de senha
  characters/              CRUD de investigadores, avatar e PDF
  sheet/                   ficha guiada (wizard) e visualização
  campaigns/  notes/       campanhas, elenco e notas de sessão
  players/  profile/       perfis públicos e o próprio perfil
  guardian/                painel do mestre
  tutorial/                tour guiado
supabase/migrations/       esquema do banco, regras de acesso e correções
```

## Rodando localmente

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # gera dist/
```

A URL do projeto e a chave **publicável** do Supabase ficam em `src/lib/supabaseClient.js`. Essa chave pode ficar no código: quem protege os dados são as regras de RLS do banco.

## Banco de dados

O esquema completo está em `supabase/migrations/`:

- `0001_esquema_inicial.sql`: tabelas, chaves, gatilhos, regras de acesso e o bucket `characters`
- `0002_seguranca.sql`: fecha brechas de permissão (upload de arquivos por qualquer pessoa, criação de notas sem ser o Guardião e leitura dos dados sem login)

## Próximos passos

- Trocar os `onclick` do HTML por `addEventListener`
- Separar o `index.html` em templates por página
- Configurar um SMTP próprio no Supabase para os emails de recuperação de senha chegarem a todos os jogadores
