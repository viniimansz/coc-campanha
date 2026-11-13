-- Esquema inicial do RPG, extraído do projeto original do Supabase.
-- Só estrutura, regras e permissões. Os dados ficam no banco.

insert into storage.buckets (id, name, public) values ('characters', 'characters', true) on conflict (id) do nothing;

CREATE FUNCTION public.check_character_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if (select count(*) from characters where user_id = new.user_id) >= 10 then
    raise exception 'Limite de 10 personagens por jogador atingido';
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.check_character_limit() OWNER TO postgres;

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    invite_code text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    cover_url text,
    banner_url text
);


ALTER TABLE public.campaigns OWNER TO postgres;

CREATE TABLE public.characters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_email text,
    campaign_id uuid,
    name text,
    occupation text,
    age text,
    gender text,
    birthplace text,
    residence text,
    avatar_url text,
    ficha_url text,
    ficha_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.characters OWNER TO postgres;

CREATE TABLE public.characters_old (
    id bigint NOT NULL,
    user_id uuid,
    user_email text,
    name text,
    occupation text,
    age text,
    gender text,
    birthplace text,
    residence text,
    avatar_url text,
    ficha_url text,
    ficha_name text,
    updated_at timestamp with time zone
);


ALTER TABLE public.characters_old OWNER TO postgres;

ALTER TABLE public.characters_old ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.characters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.coc_sheets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    character_id uuid,
    forca integer DEFAULT 50,
    constituicao integer DEFAULT 50,
    tamanho integer DEFAULT 50,
    destreza integer DEFAULT 50,
    aparencia integer DEFAULT 50,
    inteligencia integer DEFAULT 50,
    poder integer DEFAULT 50,
    educacao integer DEFAULT 50,
    occupation_id text,
    pv_max integer DEFAULT 10,
    pv_atual integer DEFAULT 10,
    pm_max integer DEFAULT 10,
    pm_atual integer DEFAULT 10,
    sanidade_max integer DEFAULT 50,
    sanidade_atual integer DEFAULT 50,
    sorte integer DEFAULT 50,
    movimento integer DEFAULT 8,
    bonus_dano text DEFAULT '0'::text,
    corpo integer DEFAULT 0,
    skills jsonb DEFAULT '{}'::jsonb,
    specializations jsonb DEFAULT '{}'::jsonb,
    equipment text,
    backstory text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    custom_skills jsonb DEFAULT '[]'::jsonb,
    weapons jsonb DEFAULT '[]'::jsonb,
    antecedentes jsonb DEFAULT '{}'::jsonb,
    dinheiro jsonb DEFAULT '{}'::jsonb,
    nivel_credito integer DEFAULT 0,
    raw_skill_allocation jsonb DEFAULT '{}'::jsonb,
    checked_skills jsonb DEFAULT '[]'::jsonb
);


ALTER TABLE public.coc_sheets OWNER TO postgres;

CREATE TABLE public.investigator_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    character_id uuid,
    linked_character_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.investigator_links OWNER TO postgres;

CREATE TABLE public.notes (
    id bigint NOT NULL,
    author_id uuid,
    session text,
    title text,
    content text,
    created_at timestamp with time zone DEFAULT now(),
    campaign_id uuid
);


ALTER TABLE public.notes OWNER TO postgres;

ALTER TABLE public.notes ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.occupations_reference (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    skill_points_formula text NOT NULL,
    credit_rating_min integer DEFAULT 9,
    credit_rating_max integer DEFAULT 30,
    suggested_skills text[] NOT NULL
);


ALTER TABLE public.occupations_reference OWNER TO postgres;

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    display_name text,
    bio text,
    avatar_url text,
    banner_url text,
    created_at timestamp with time zone DEFAULT now(),
    cover_url text,
    nickname text,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.profiles OWNER TO postgres;

CREATE TABLE public.skills_reference (
    id text NOT NULL,
    name text NOT NULL,
    base_value integer NOT NULL,
    has_specialization boolean DEFAULT false,
    category text DEFAULT 'geral'::text
);


ALTER TABLE public.skills_reference OWNER TO postgres;



-- ===== constraints, policies, grants =====

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_invite_code_key UNIQUE (invite_code);

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.characters_old
    ADD CONSTRAINT characters_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_pkey1 PRIMARY KEY (id);

ALTER TABLE ONLY public.characters_old
    ADD CONSTRAINT characters_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.coc_sheets
    ADD CONSTRAINT coc_sheets_character_id_key UNIQUE (character_id);

ALTER TABLE ONLY public.coc_sheets
    ADD CONSTRAINT coc_sheets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.investigator_links
    ADD CONSTRAINT investigator_links_character_id_linked_character_id_key UNIQUE (character_id, linked_character_id);

ALTER TABLE ONLY public.investigator_links
    ADD CONSTRAINT investigator_links_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.occupations_reference
    ADD CONSTRAINT occupations_reference_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY public.skills_reference
    ADD CONSTRAINT skills_reference_pkey PRIMARY KEY (id);

CREATE TRIGGER character_limit_trigger BEFORE INSERT ON public.characters FOR EACH ROW EXECUTE FUNCTION public.check_character_limit();

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.coc_sheets
    ADD CONSTRAINT coc_sheets_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.coc_sheets
    ADD CONSTRAINT coc_sheets_occupation_id_fkey FOREIGN KEY (occupation_id) REFERENCES public.occupations_reference(id);

ALTER TABLE ONLY public.investigator_links
    ADD CONSTRAINT investigator_links_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.investigator_links
    ADD CONSTRAINT investigator_links_linked_character_id_fkey FOREIGN KEY (linked_character_id) REFERENCES public.characters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Dono atualiza propria ficha CoC" ON public.coc_sheets FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.characters c
  WHERE ((c.id = coc_sheets.character_id) AND (c.user_id = auth.uid())))));

CREATE POLICY "Dono deleta propria ficha CoC" ON public.coc_sheets FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.characters c
  WHERE ((c.id = coc_sheets.character_id) AND (c.user_id = auth.uid())))));

CREATE POLICY "Dono edita propria ficha CoC" ON public.coc_sheets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.characters c
  WHERE ((c.id = coc_sheets.character_id) AND (c.user_id = auth.uid())))));

CREATE POLICY "Dono gerencia proprios links" ON public.investigator_links USING ((EXISTS ( SELECT 1
   FROM public.characters c
  WHERE ((c.id = investigator_links.character_id) AND (c.user_id = auth.uid())))));

CREATE POLICY "Guardiao edita notas" ON public.notes FOR UPDATE USING ((auth.email() = 'viniimansz@gmail.com'::text));

CREATE POLICY "Guardiao edita qualquer ficha CoC" ON public.coc_sheets FOR UPDATE USING ((auth.email() = 'viniimansz@gmail.com'::text));

CREATE POLICY "Guardiao exclui notas" ON public.notes FOR DELETE USING ((auth.email() = 'viniimansz@gmail.com'::text));

CREATE POLICY "Guardiao gerencia todos os links" ON public.investigator_links USING ((auth.email() = 'viniimansz@gmail.com'::text));

CREATE POLICY "Guardiao publica notas" ON public.notes FOR INSERT WITH CHECK ((auth.email() = 'viniimansz@gmail.com'::text));

CREATE POLICY "Guardião cria campanhas" ON public.campaigns FOR INSERT WITH CHECK ((auth.email() = 'viniimansz@gmail.com'::text));

CREATE POLICY "Guardião cria notas" ON public.notes FOR INSERT WITH CHECK (true);

CREATE POLICY "Guardião edita campanhas" ON public.campaigns FOR UPDATE USING ((auth.email() = 'viniimansz@gmail.com'::text));

CREATE POLICY "Guardião exclui campanhas" ON public.campaigns FOR DELETE USING ((auth.email() = 'viniimansz@gmail.com'::text));

CREATE POLICY "Guardião exclui qualquer personagem" ON public.characters FOR DELETE USING ((auth.email() = 'viniimansz@gmail.com'::text));

CREATE POLICY "Guardião gerencia todos os personagens" ON public.characters FOR UPDATE USING ((auth.email() = 'viniimansz@gmail.com'::text));

CREATE POLICY "Guardião vê todos" ON public.characters_old FOR SELECT USING (true);

CREATE POLICY "Leitura publica occupations_reference" ON public.occupations_reference FOR SELECT USING (true);

CREATE POLICY "Leitura publica skills_reference" ON public.skills_reference FOR SELECT USING (true);

CREATE POLICY "Todos leem notas" ON public.notes FOR SELECT USING (true);

CREATE POLICY "Todos veem campanhas" ON public.campaigns FOR SELECT USING (true);

CREATE POLICY "Todos veem fichas CoC" ON public.coc_sheets FOR SELECT USING (true);

CREATE POLICY "Todos veem links de investigadores" ON public.investigator_links FOR SELECT USING (true);

CREATE POLICY "Todos veem notas" ON public.notes FOR SELECT USING (true);

CREATE POLICY "Todos veem perfis" ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Todos veem personagens" ON public.characters FOR SELECT USING (true);

CREATE POLICY "Usuário atualiza próprio perfil" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "Usuário atualiza próprio personagem" ON public.characters FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "Usuário exclui próprio personagem" ON public.characters FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "Usuário insere próprio perfil" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuário insere próprio personagem" ON public.characters FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Usuário salva o próprio personagem" ON public.characters_old USING ((auth.uid() = user_id));

CREATE POLICY "Usuário vê o próprio personagem" ON public.characters_old FOR SELECT USING ((auth.uid() = user_id));

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.characters_old ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.coc_sheets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.investigator_links ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.occupations_reference ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.skills_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura publica bucket characters" ON storage.objects FOR SELECT USING ((bucket_id = 'characters'::text));

CREATE POLICY "Leitura pública" ON storage.objects FOR SELECT USING ((bucket_id = 'characters'::text));

CREATE POLICY "Update próprio" ON storage.objects FOR UPDATE USING ((bucket_id = 'characters'::text));

CREATE POLICY "Upload próprio" ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'characters'::text));

CREATE POLICY "Usuario atualiza proprios arquivos characters" ON storage.objects FOR UPDATE USING (((bucket_id = 'characters'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Usuario envia proprios arquivos characters" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'characters'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Usuario exclui proprios arquivos characters" ON storage.objects FOR DELETE USING (((bucket_id = 'characters'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

REVOKE ALL ON TABLE public.campaigns FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.characters FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.characters_old FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.coc_sheets FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.investigator_links FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.notes FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.occupations_reference FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated, service_role;
REVOKE ALL ON TABLE public.skills_reference FROM anon, authenticated, service_role;

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.campaigns TO anon;
GRANT ALL ON TABLE public.campaigns TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.campaigns TO service_role;

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.characters TO anon;
GRANT ALL ON TABLE public.characters TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.characters TO service_role;

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.characters_old TO anon;
GRANT ALL ON TABLE public.characters_old TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.characters_old TO service_role;

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.coc_sheets TO anon;
GRANT ALL ON TABLE public.coc_sheets TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.coc_sheets TO service_role;

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.investigator_links TO anon;
GRANT ALL ON TABLE public.investigator_links TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.investigator_links TO service_role;

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.notes TO anon;
GRANT ALL ON TABLE public.notes TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.notes TO service_role;

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.occupations_reference TO anon;
GRANT ALL ON TABLE public.occupations_reference TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.occupations_reference TO service_role;

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.profiles TO service_role;

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.skills_reference TO anon;
GRANT ALL ON TABLE public.skills_reference TO authenticated;
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.skills_reference TO service_role;
