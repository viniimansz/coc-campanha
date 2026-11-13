-- =====================================================================
-- 0002 — fecha brechas de permissão herdadas do projeto original
--
--  1. Storage: "Upload próprio" e "Update próprio" deixavam QUALQUER
--     pessoa (até sem login) enviar ou sobrescrever arquivos de outros
--     jogadores. Ficam só as regras por pasta (<id do usuário>/...),
--     que é como o site já salva tudo.
--  2. Storage: a leitura pública permitia listar todos os arquivos.
--     As imagens continuam abrindo pela URL pública; listar passa a
--     exigir login.
--  3. Notas: "Guardião cria notas" aceitava qualquer um (WITH CHECK true).
--     Fica só a regra que confere o email do Guardião.
--  4. Leitura das tabelas do jogo passa a exigir login. Antes, quem não
--     estava logado conseguia ler tudo pela API, inclusive os emails dos
--     jogadores em characters.user_email. O site só mostra dados depois
--     do login, então nada muda para quem usa.
--  5. characters_old (tabela antiga) deixa de ser legível por todos.
-- =====================================================================

-- 1 e 2. storage
drop policy if exists "Upload próprio" on storage.objects;
drop policy if exists "Update próprio" on storage.objects;
drop policy if exists "Leitura pública" on storage.objects;
drop policy if exists "Leitura publica bucket characters" on storage.objects;
drop policy if exists "Logado le bucket characters" on storage.objects;
create policy "Logado le bucket characters" on storage.objects for select to authenticated
  using (bucket_id = 'characters');

-- 3. notas
drop policy if exists "Guardião cria notas" on public.notes;

-- 4. leitura só com login
drop policy if exists "Todos veem campanhas" on public.campaigns;
create policy "Todos veem campanhas" on public.campaigns for select to authenticated using (true);

drop policy if exists "Todos veem personagens" on public.characters;
create policy "Todos veem personagens" on public.characters for select to authenticated using (true);

drop policy if exists "Todos veem fichas CoC" on public.coc_sheets;
create policy "Todos veem fichas CoC" on public.coc_sheets for select to authenticated using (true);

drop policy if exists "Todos veem links de investigadores" on public.investigator_links;
create policy "Todos veem links de investigadores" on public.investigator_links for select to authenticated using (true);

drop policy if exists "Todos veem notas" on public.notes;
drop policy if exists "Todos leem notas" on public.notes;
create policy "Todos veem notas" on public.notes for select to authenticated using (true);

drop policy if exists "Todos veem perfis" on public.profiles;
create policy "Todos veem perfis" on public.profiles for select to authenticated using (true);

-- 5. tabela antiga: só o dono e o Guardião
drop policy if exists "Guardião vê todos" on public.characters_old;
create policy "Guardião vê todos" on public.characters_old for select
  using (auth.email() = 'viniimansz@gmail.com');

-- anon não precisa de nenhum acesso às tabelas do jogo
revoke all on table public.campaigns, public.characters, public.characters_old,
  public.coc_sheets, public.investigator_links, public.notes, public.profiles
  from anon;

-- TRUNCATE ignora as regras de RLS; ninguém do lado do site precisa dele.
revoke truncate on all tables in schema public from anon, authenticated;
