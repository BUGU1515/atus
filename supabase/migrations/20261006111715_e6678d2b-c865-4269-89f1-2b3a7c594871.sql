CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('candidato','empresa')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated, anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis visiveis" ON public.profiles FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, tipo) VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome',''), split_part(NEW.email,'@',1)),
    CASE WHEN NEW.raw_user_meta_data->>'tipo' = 'empresa' THEN 'empresa' ELSE 'candidato' END
  );
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.tipo_usuario(_uid uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tipo FROM public.profiles WHERE id = _uid
$$;

CREATE TABLE public.vagas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text NOT NULL,
  cidade text,
  modalidade text CHECK (modalidade IN ('presencial','hibrido','remoto')),
  salario text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vagas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vagas TO authenticated;
GRANT ALL ON public.vagas TO service_role;
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vagas publicas" ON public.vagas FOR SELECT USING (true);
CREATE POLICY "empresa publica" ON public.vagas FOR INSERT TO authenticated
  WITH CHECK (empresa_id = auth.uid() AND public.tipo_usuario(auth.uid()) = 'empresa');
CREATE POLICY "empresa edita" ON public.vagas FOR UPDATE TO authenticated USING (empresa_id = auth.uid());
CREATE POLICY "empresa apaga" ON public.vagas FOR DELETE TO authenticated USING (empresa_id = auth.uid());

CREATE TABLE public.candidaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id uuid NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  candidato_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'enviada',
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vaga_id, candidato_id)
);
GRANT SELECT, INSERT ON public.candidaturas TO authenticated;
GRANT ALL ON public.candidaturas TO service_role;
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidato envia" ON public.candidaturas FOR INSERT TO authenticated
  WITH CHECK (candidato_id = auth.uid() AND public.tipo_usuario(auth.uid()) = 'candidato');
CREATE POLICY "ver proprias ou da empresa" ON public.candidaturas FOR SELECT TO authenticated
  USING (candidato_id = auth.uid() OR EXISTS (SELECT 1 FROM public.vagas v WHERE v.id = vaga_id AND v.empresa_id = auth.uid()));

CREATE INDEX idx_vagas_titulo ON public.vagas(titulo);