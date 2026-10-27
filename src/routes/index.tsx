import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aptus — Vagas e talentos" },
      { name: "description", content: "Aptus conecta talentos a oportunidades reais. Encontre vagas ou publique a sua." },
      { property: "og:title", content: "Aptus — Vagas e talentos" },
      { property: "og:description", content: "Encontre vagas ou publique a sua no Aptus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Aptus,
});

type Tela = "entrada" | "login" | "cadastro" | "vagas";
type Aba = "vagas" | "candidaturas" | "perfil";
type Perfil = { id: string; nome: string; tipo: "candidato" | "empresa" };
type Vaga = {
  id: string; titulo: string; descricao: string; cidade: string | null;
  modalidade: string | null; salario: string | null; empresa: { nome: string } | null;
};

const MOD: Record<string, string> = { presencial: "Presencial", hibrido: "Híbrido", remoto: "Remoto" };

function Logo() {
  return (
    <svg className="ap-logo w-[132px]" viewBox="0 0 120 110" role="img" aria-label="Logo Aptus">
      <path d="M60 6 114 102H6Z" fill="var(--azul)" stroke="var(--tinta)" strokeWidth="5" strokeLinejoin="round" />
      <path d="M60 40 78 102H46Z" fill="var(--papel)" />
    </svg>
  );
}

function Aptus() {
  const [tela, setTela] = useState<Tela>("entrada");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [aviso, setAviso] = useState("");

  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(""), 2500); };

  const carregarPerfil = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select("id,nome,tipo").eq("id", uid).maybeSingle();
    if (data) { setPerfil(data as Perfil); setTela("vagas"); }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) setTimeout(() => carregarPerfil(s.user.id), 0);
      else { setPerfil(null); setTela((t) => (t === "vagas" ? "entrada" : t)); }
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) carregarPerfil(data.session.user.id); });
    return () => sub.subscription.unsubscribe();
  }, [carregarPerfil]);

  return (
    <div className="flex min-h-screen justify-center">
      <main className="w-full max-w-[420px] p-6">
        {tela === "entrada" && (
          <section className="flex min-h-[calc(100vh-48px)] flex-col items-center justify-center gap-1.5 text-center">
            <Logo />
            <h1 className="mt-2 pl-[.2em] text-5xl font-extrabold tracking-[.2em]">Aptus</h1>
            <p className="mb-7 mt-1.5 max-w-[26ch] leading-relaxed">Conectando talentos a oportunidades reais.</p>
            <div className="grid w-full gap-3">
              <button className="ap-btn ap-btn-primario" onClick={() => setTela("login")}>Fazer login</button>
              <button className="ap-btn" onClick={() => setTela("cadastro")}>Criar cadastro</button>
            </div>
            <p className="mt-7 flex items-center gap-2 text-sm opacity-70">🔒 Sua conta está segura. Seus dados ficam só com você.</p>
          </section>
        )}
        {tela === "login" && <Login ir={setTela} />}
        {tela === "cadastro" && <Cadastro ir={setTela} avisar={avisar} />}
        {tela === "vagas" && perfil && <AreaLogada perfil={perfil} setPerfil={setPerfil} avisar={avisar} />}
      </main>
      <div
        role="status"
        className={`pointer-events-none fixed bottom-5 left-1/2 -translate-x-1/2 rounded-[10px] bg-tinta px-4 py-2.5 text-branco transition-opacity ${aviso ? "opacity-100" : "opacity-0"}`}
      >
        {aviso}
      </div>
    </div>
  );
}

function Voltar({ ir }: { ir: (t: Tela) => void }) {
  return (
    <button aria-label="Voltar" onClick={() => ir("entrada")} className="self-start py-1 pr-2 text-2xl">←</button>
  );
}

function Campo(props: React.InputHTMLAttributes<HTMLInputElement> & { rotulo: string }) {
  const { rotulo, ...rest } = props;
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {rotulo}
      <input className="ap-input" required {...rest} />
    </label>
  );
}

function Login({ ir }: { ir: (t: Tela) => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);
  return (
    <section className="flex flex-col">
      <Voltar ir={ir} />
      <h2 className="mb-5 mt-3 text-2xl font-bold">Entrar na sua conta</h2>
      <form
        className="grid gap-3.5"
        onSubmit={async (e) => {
          e.preventDefault(); setMsg(""); setCarregando(true);
          const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
          setCarregando(false);
          if (error) setMsg(error.message.includes("confirm") ? "Confirme seu e-mail antes de entrar." : "E-mail ou senha incorretos.");
        }}
      >
        <Campo rotulo="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo rotulo="Senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <p role="alert" className="m-0 min-h-[1.2em] text-sm text-erro">{msg}</p>
        <button className="ap-btn ap-btn-primario" disabled={carregando}>{carregando ? "Entrando..." : "Entrar"}</button>
      </form>
      <p className="mt-5 text-center text-sm">
        Ainda não tem conta? <button className="font-semibold text-azul underline" onClick={() => ir("cadastro")}>Criar cadastro</button>
      </p>
    </section>
  );
}

function Cadastro({ ir, avisar }: { ir: (t: Tela) => void; avisar: (t: string) => void }) {
  const [tipo, setTipo] = useState<"candidato" | "empresa">("candidato");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);
  return (
    <section className="flex flex-col">
      <Voltar ir={ir} />
      <h2 className="mb-5 mt-3 text-2xl font-bold">Criar cadastro</h2>
      <form
        className="grid gap-3.5"
        onSubmit={async (e) => {
          e.preventDefault(); setMsg("");
          if (!nome.trim() || senha.length < 6) return setMsg("Preencha nome, e-mail válido e senha com 6+ caracteres.");
          setCarregando(true);
          const { data, error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(), password: senha,
            options: { data: { nome: nome.trim(), tipo }, emailRedirectTo: window.location.origin },
          });
          setCarregando(false);
          if (error) return setMsg(error.message.includes("registered") ? "Este e-mail já tem cadastro. Faça login." : error.message);
          if (!data.session) { avisar("Enviamos um link de confirmação para seu e-mail."); ir("login"); }
        }}
      >
        <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Tipo de conta">
          {(["candidato", "empresa"] as const).map((t) => (
            <button
              type="button" key={t} role="radio" aria-checked={tipo === t} onClick={() => setTipo(t)}
              className={`ap-btn px-3 py-3 ${tipo === t ? "ap-btn-primario" : ""}`}
            >
              {t === "candidato" ? "Quero uma vaga" : "Quero contratar"}
            </button>
          ))}
        </div>
        <Campo rotulo="Nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Campo rotulo="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo rotulo="Senha (6+ caracteres)" type="password" minLength={6} autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <p role="alert" className="m-0 min-h-[1.2em] text-sm text-erro">{msg}</p>
        <button className="ap-btn ap-btn-primario" disabled={carregando}>{carregando ? "Criando..." : "Criar conta"}</button>
      </form>
      <p className="mt-5 text-center text-sm">
        Já tem conta? <button className="font-semibold text-azul underline" onClick={() => ir("login")}>Fazer login</button>
      </p>
    </section>
  );
}

function Vagas({ perfil, avisar }: { perfil: Perfil; avisar: (t: string) => void }) {
  const [busca, setBusca] = useState("");
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [enviadas, setEnviadas] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ titulo: "", descricao: "", cidade: "", modalidade: "presencial", salario: "" });

  const carregar = useCallback(async (q: string) => {
    let query = supabase
      .from("vagas")
      .select("id,titulo,descricao,cidade,modalidade,salario,empresa:profiles(nome)")
      .order("criado_em", { ascending: false })
      .limit(50);
    const t = q.trim().replace(/[%,()]/g, " ");
    if (t) query = query.or(`titulo.ilike.%${t}%,descricao.ilike.%${t}%,cidade.ilike.%${t}%`);
    const { data } = await query;
    setVagas((data as unknown as Vaga[]) ?? []);
  }, []);

  useEffect(() => { const id = setTimeout(() => carregar(busca), 300); return () => clearTimeout(id); }, [busca, carregar]);

  useEffect(() => {
    if (perfil.tipo !== "candidato") return;
    supabase.from("candidaturas").select("vaga_id").eq("candidato_id", perfil.id)
      .then(({ data }) => setEnviadas(new Set((data ?? []).map((c) => c.vaga_id))));
  }, [perfil]);

  const candidatar = async (id: string) => {
    const { error } = await supabase.from("candidaturas").insert({ vaga_id: id, candidato_id: perfil.id });
    if (error) return avisar(error.code === "23505" ? "Você já se candidatou a esta vaga." : "Algo deu errado. Tente de novo.");
    setEnviadas((s) => new Set(s).add(id));
    avisar("Candidatura enviada!");
  };

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descricao.trim()) return avisar("Informe título e descrição da vaga.");
    const { error } = await supabase.from("vagas").insert({
      empresa_id: perfil.id, titulo: form.titulo.trim(), descricao: form.descricao.trim(),
      cidade: form.cidade.trim() || null, modalidade: form.modalidade, salario: form.salario.trim() || null,
    });
    if (error) return avisar("Não foi possível publicar. Tente de novo.");
    setForm({ titulo: "", descricao: "", cidade: "", modalidade: "presencial", salario: "" });
    avisar("Vaga publicada!");
    carregar(busca);
  };

  return (
    <section className="flex flex-col">
      <header className="mb-4">
        <p className="text-sm opacity-70">Olá, {perfil.nome.split(" ")[0]}</p>
        <h2 className="text-2xl font-bold">{perfil.tipo === "empresa" ? "Suas oportunidades" : "Vagas para você"}</h2>
      </header>
      <input className="ap-input" type="search" placeholder="Buscar por cargo, descrição ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="my-4 grid gap-3" aria-live="polite">
        {vagas.length ? vagas.map((v) => (
          <article key={v.id} className="ap-card grid gap-1.5">
            <h3 className="m-0 text-lg font-bold">{v.titulo}</h3>
            <span className="text-xs opacity-75">
              {v.empresa?.nome ?? "Empresa"} · {v.cidade || "Brasil"}{v.modalidade ? ` · ${MOD[v.modalidade]}` : ""}{v.salario ? ` · ${v.salario}` : ""}
            </span>
            <p className="m-0 whitespace-pre-line text-sm leading-relaxed">{v.descricao}</p>
            {perfil.tipo === "candidato" && (
              <button className="ap-btn ap-btn-primario mt-1" disabled={enviadas.has(v.id)} onClick={() => candidatar(v.id)}>
                {enviadas.has(v.id) ? "Candidatura enviada" : "Candidatar-se"}
              </button>
            )}
          </article>
        )) : (
          <p className="ap-card p-6 text-center opacity-80">Nenhuma vaga encontrada. Tente outra busca.</p>
        )}
      </div>
      {perfil.tipo === "empresa" && (
        <form onSubmit={publicar} className="mt-3 grid gap-3.5 border-t-2 border-dashed border-tinta pt-4">
          <h3 className="m-0 text-lg font-bold">Publicar vaga</h3>
          <input className="ap-input" placeholder="Título da vaga" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
          <textarea className="ap-input min-h-[90px]" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
          <input className="ap-input" placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          <select className="ap-input" value={form.modalidade} onChange={(e) => setForm({ ...form, modalidade: e.target.value })}>
            <option value="presencial">Presencial</option><option value="hibrido">Híbrido</option><option value="remoto">Remoto</option>
          </select>
          <input className="ap-input" placeholder="Salário (opcional)" value={form.salario} onChange={(e) => setForm({ ...form, salario: e.target.value })} />
          <button className="ap-btn ap-btn-primario">Publicar vaga</button>
        </form>
      )}
    </section>
  );
}

function AreaLogada({ perfil, setPerfil, avisar }: { perfil: Perfil; setPerfil: (p: Perfil) => void; avisar: (t: string) => void }) {
  const [aba, setAba] = useState<Aba>("vagas");
  const abas: { id: Aba; rotulo: string; icone: string }[] = [
    { id: "vagas", rotulo: "Vagas", icone: "⌕" },
    { id: "candidaturas", rotulo: perfil.tipo === "empresa" ? "Recebidas" : "Candidaturas", icone: "▤" },
    { id: "perfil", rotulo: "Perfil", icone: "◉" },
  ];
  return (
    <div className="pb-24">
      {aba === "vagas" && <Vagas perfil={perfil} avisar={avisar} />}
      {aba === "candidaturas" && <Candidaturas perfil={perfil} />}
      {aba === "perfil" && <PerfilTela perfil={perfil} setPerfil={setPerfil} avisar={avisar} />}
      <nav className="fixed inset-x-0 bottom-0 border-t-2 border-tinta bg-branco" aria-label="Navegação principal">
        <div className="mx-auto grid max-w-[420px] grid-cols-3">
          {abas.map((a) => (
            <button key={a.id} onClick={() => setAba(a.id)} aria-current={aba === a.id ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${aba === a.id ? "text-azul" : "opacity-60"}`}>
              <span className="text-xl leading-none">{a.icone}</span>{a.rotulo}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

type Cand = { id: string; status: string; criado_em: string; vaga: { titulo: string; cidade: string | null } | null; candidato: { nome: string } | null };
const STATUS: Record<string, string> = { enviada: "Enviada", em_analise: "Em análise", aprovada: "Aprovada", recusada: "Recusada" };

function Candidaturas({ perfil }: { perfil: Perfil }) {
  const [lista, setLista] = useState<Cand[] | null>(null);
  useEffect(() => {
    const q = supabase.from("candidaturas")
      .select("id,status,criado_em,vaga:vagas!inner(titulo,cidade,empresa_id),candidato:profiles(nome)")
      .order("criado_em", { ascending: false });
    (perfil.tipo === "empresa" ? q.eq("vaga.empresa_id", perfil.id) : q.eq("candidato_id", perfil.id))
      .then(({ data }) => setLista((data as unknown as Cand[]) ?? []));
  }, [perfil]);
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold">{perfil.tipo === "empresa" ? "Candidaturas recebidas" : "Minhas candidaturas"}</h2>
      {lista === null ? <p className="opacity-70">Carregando...</p> : lista.length === 0 ? (
        <p className="ap-card p-6 text-center opacity-80">{perfil.tipo === "empresa" ? "Nenhuma candidatura ainda." : "Você ainda não se candidatou a nenhuma vaga."}</p>
      ) : (
        <div className="grid gap-3">
          {lista.map((c) => (
            <article key={c.id} className="ap-card flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold">{c.vaga?.titulo}</h3>
                <p className="text-xs opacity-75">
                  {perfil.tipo === "empresa" ? c.candidato?.nome : c.vaga?.cidade || "Brasil"} · {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <span className="rounded-full bg-papel px-3 py-1 text-xs font-semibold">{STATUS[c.status] ?? c.status}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PerfilTela({ perfil, setPerfil, avisar }: { perfil: Perfil; setPerfil: (p: Perfil) => void; avisar: (t: string) => void }) {
  const [tela, setTela] = useState<"menu" | "editar" | "config">("menu");
  const [nome, setNome] = useState(perfil.nome);
  const [notif, setNotif] = useState(true);
  if (tela === "editar") return (
    <section className="flex flex-col">
      <button onClick={() => setTela("menu")} className="self-start text-2xl" aria-label="Voltar">←</button>
      <h2 className="mb-4 mt-2 text-2xl font-bold">Editar perfil</h2>
      <form className="grid gap-3.5" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase.from("profiles").update({ nome: nome.trim() }).eq("id", perfil.id);
        if (error) return avisar("Não foi possível salvar.");
        setPerfil({ ...perfil, nome: nome.trim() }); avisar("Perfil atualizado!"); setTela("menu");
      }}>
        <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <button className="ap-btn ap-btn-primario">Salvar</button>
      </form>
    </section>
  );
  if (tela === "config") return (
    <section className="flex flex-col">
      <button onClick={() => setTela("menu")} className="self-start text-2xl" aria-label="Voltar">←</button>
      <h2 className="mb-4 mt-2 text-2xl font-bold">Configurações</h2>
      <div className="ap-card grid divide-y divide-tinta/15 p-0">
        <label className="flex items-center justify-between p-4 font-semibold">Notificações de vagas
          <input type="checkbox" className="h-5 w-5 accent-[var(--azul)]" checked={notif} onChange={(e) => setNotif(e.target.checked)} />
        </label>
        <div className="p-4"><p className="font-semibold">Privacidade</p><p className="text-sm opacity-70">Seus dados só são compartilhados com as empresas às quais você se candidata.</p></div>
        <div className="p-4"><p className="font-semibold">Ajuda</p><p className="text-sm opacity-70">Dúvidas? Fale com o suporte Aptus.</p></div>
      </div>
    </section>
  );
  const itens: [string, () => void][] = [
    ["Editar perfil", () => setTela("editar")],
    ["Configurações", () => setTela("config")],
  ];
  return (
    <section>
      <div className="mb-5 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-azul text-2xl font-bold text-branco">{perfil.nome[0]?.toUpperCase()}</div>
        <div>
          <h2 className="text-xl font-bold">{perfil.nome}</h2>
          <p className="text-sm opacity-70">{perfil.tipo === "empresa" ? "Conta de empresa" : "Conta de candidato"}</p>
        </div>
      </div>
      <div className="ap-card grid divide-y divide-tinta/15 p-0">
        {itens.map(([r, f]) => (
          <button key={r} onClick={f} className="flex justify-between p-4 text-left font-semibold">{r}<span>›</span></button>
        ))}
        <button onClick={() => supabase.auth.signOut()} className="p-4 text-left font-semibold text-erro">Sair</button>
      </div>
    </section>
  );
}
