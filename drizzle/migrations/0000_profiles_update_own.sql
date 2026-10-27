GRANT UPDATE (nome) ON public.profiles TO authenticated;
CREATE POLICY "edita proprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());