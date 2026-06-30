import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Calendar,
  Pill,
  LineChart,
  ListChecks,
  Plus,
  Trash2,
  Bell,
  Heart,
  Check,
  BookOpen,
  Sparkles,
  AlarmClock,
  X,
  UserRound,
  Users,
  Stethoscope,
  Activity,
  Flower2,
  LogOut,
} from "lucide-react";
import {
  loadData,
  saveData,
  uid,
  type Appointment,
  type Data,
  type EvolutionEntry,
  type Medication,
  type RoutineStep,
  type Gratitude,
  type Caregiver,
  type Doctor,
  type Therapist,
  type AppointmentType,
  type MedicationLog,
  type Conquest,
  APPOINTMENT_TYPES,
} from "@/lib/tea-storage";
import { checkAlerts, ensureNotificationPermission, type AlarmEvent } from "@/lib/tea-alerts";
import { primeAudio, startAlarm, stopAlarm } from "@/lib/tea-alarm-sound";
import { verseOfTheDay, VERSES } from "@/lib/tea-verses";
import { Toaster, toast } from "sonner";
import { sb } from "@/lib/tea-supabase";
import type { Session } from "@supabase/supabase-js";
import {
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend as RLegend,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cuidar+ TEA — Agenda, Medicações e Evolução" },
      {
        name: "description",
        content:
          "Aplicativo para apoio ao Transtorno do Espectro Autista: agenda de consultas, medicações, evolução e rotina passo a passo com alertas.",
      },
      { property: "og:title", content: "Cuidar+ TEA" },
      {
        property: "og:description",
        content:
          "Agenda, medicações, evolução e rotina passo a passo com alertas — apoio diário para o TEA.",
      },
    ],
  }),
  component: Index,
});

type Tab = "cadastro" | "rotina" | "agenda" | "medicacoes" | "evolucao" | "versiculo" | "gratidao" | "jardim";

/* ---------------- AUTENTICAÇÃO ---------------- */
function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } =
      mode === "login"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "signup") toast.success("Conta criada com sucesso!");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-5">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-2">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-semibold">Cuidar+ TEA</h1>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Entre ou crie uma conta para acompanhar com segurança, em qualquer aparelho.
          </p>
        </div>

        <div className="flex rounded-xl bg-muted p-1 mb-4">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 text-sm py-1.5 rounded-lg transition ${mode === "login" ? "bg-card shadow font-medium" : "text-muted-foreground"}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 text-sm py-1.5 rounded-lg transition ${mode === "signup" ? "bg-card shadow font-medium" : "text-muted-foreground"}`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          <PrimaryBtn type="submit" disabled={loading} className="w-full justify-center">
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </PrimaryBtn>
        </form>
      </Card>
    </div>
  );
}

function Index() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("versiculo");
  const [notifOn, setNotifOn] = useState(false);
  const [alarm, setAlarm] = useState<AlarmEvent | null>(null);

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: sub } = sb.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setData(null);
      return;
    }
    loadData(session.user.id).then(setData);
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user && data) saveData(session.user.id, data);
  }, [data, session?.user?.id]);

  if (session === undefined || (session && !data)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <AppShell data={data as Data} setData={setData} tab={tab} setTab={setTab} notifOn={notifOn} setNotifOn={setNotifOn} alarm={alarm} setAlarm={setAlarm} />;
}

function AppShell({
  data,
  setData,
  tab,
  setTab,
  notifOn,
  setNotifOn,
  alarm,
  setAlarm,
}: {
  data: Data;
  setData: React.Dispatch<React.SetStateAction<Data | null>>;
  tab: Tab;
  setTab: (t: Tab) => void;
  notifOn: boolean;
  setNotifOn: (v: boolean) => void;
  alarm: AlarmEvent | null;
  setAlarm: (a: AlarmEvent | null) => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifOn(Notification.permission === "granted");
    }
    const tick = () =>
      checkAlerts(
        data.appointments,
        data.medications,
        (m) => toast(m, { icon: "🔔" }),
        (ev) => {
          setAlarm(ev);
          startAlarm();
        },
      );
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [data.appointments, data.medications]);

  // Reset routine daily
  useEffect(() => {
    const key = "tea-routine-day";
    const today = new Date().toDateString();
    const last = localStorage.getItem(key);
    if (last !== today) {
      localStorage.setItem(key, today);
      setData((d) => (d ? { ...d, routine: d.routine.map((r) => ({ ...r, done: false })) } : d));
    }
  }, []);

  async function enableNotifs() {
    primeAudio();
    const ok = await ensureNotificationPermission();
    setNotifOn(ok);
    if (ok) toast.success("Alertas ativados!");
    else toast.error("Permissão negada. Ative nas configurações do navegador.");
  }

  const update = (patch: Partial<Data>) => setData((d) => (d ? { ...d, ...patch } : d));

  function dismissAlarm() {
    stopAlarm();
    setAlarm(null);
  }

  async function logout() {
    await sb.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      {alarm && <AlarmModal event={alarm} onClose={dismissAlarm} />}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Cuidar+ TEA</h1>
              <p className="text-xs text-muted-foreground">
                {data.patient.name ? `Para ${data.patient.name}` : "Apoio diário e acolhedor"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={enableNotifs}
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition ${
                notifOn
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <Bell className="h-4 w-4" />
              {notifOn ? "Alertas ativos" : "Ativar alertas"}
            </button>
            <button
              onClick={logout}
              title="Sair"
              className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="max-w-4xl mx-auto px-2 pb-2 flex gap-1 overflow-x-auto">
          <TabBtn active={tab === "versiculo"} onClick={() => setTab("versiculo")} icon={<BookOpen className="h-4 w-4" />} label="Versículo" />
          <TabBtn active={tab === "gratidao"} onClick={() => setTab("gratidao")} icon={<Sparkles className="h-4 w-4" />} label="Gratidão" />
          <TabBtn active={tab === "jardim"} onClick={() => setTab("jardim")} icon={<Flower2 className="h-4 w-4" />} label="Jardim" />
          <TabBtn active={tab === "cadastro"} onClick={() => setTab("cadastro")} icon={<UserRound className="h-4 w-4" />} label="Cadastro" />
          <TabBtn active={tab === "rotina"} onClick={() => setTab("rotina")} icon={<ListChecks className="h-4 w-4" />} label="Rotina" />
          <TabBtn active={tab === "agenda"} onClick={() => setTab("agenda")} icon={<Calendar className="h-4 w-4" />} label="Agenda" />
          <TabBtn active={tab === "medicacoes"} onClick={() => setTab("medicacoes")} icon={<Pill className="h-4 w-4" />} label="Medicações" />
          <TabBtn active={tab === "evolucao"} onClick={() => setTab("evolucao")} icon={<LineChart className="h-4 w-4" />} label="Evolução" />
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {tab === "versiculo" && <VerseView />}
        {tab === "gratidao" && <GratitudeView data={data} update={update} />}
        {tab === "cadastro" && <CadastroView data={data} update={update} />}
        {tab === "rotina" && <RoutineView data={data} update={update} />}
        {tab === "agenda" && <AgendaView data={data} update={update} />}
        {tab === "medicacoes" && <MedsView data={data} update={update} />}
        {tab === "evolucao" && <EvolutionView data={data} update={update} />}
        {tab === "jardim" && <GardenView data={data} update={update} />}
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-card/80 backdrop-blur border-t border-border py-2 text-center text-xs text-muted-foreground">
        Feito com carinho 💙 — instale no celular: Compartilhar → Adicionar à Tela de Início
      </footer>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Section({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-2xl border border-border p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function PrimaryBtn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-50 ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={`w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 ${p.className ?? ""}`}
    />
  );
}

function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...p}
      className={`w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 ${p.className ?? ""}`}
    />
  );
}

/* ---------------- CADASTRO ---------------- */
function CadastroView({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  return (
    <Section title="Cadastro" subtitle="Informações da pessoa com TEA, responsáveis e equipe de cuidado.">
      <PatientCard data={data} update={update} />
      <CaregiversCard data={data} update={update} />
      <DoctorsCard data={data} update={update} />
      <TherapistsCard data={data} update={update} />
    </Section>
  );
}

function PatientCard({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  const [form, setForm] = useState(data.patient);
  const [saved, setSaved] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();
    update({ patient: form });
    setSaved(true);
    toast.success("Dados da pessoa com TEA salvos!");
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <UserRound className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Pessoa com TEA</h3>
      </div>
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
        <Input placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input type="date" placeholder="Data de nascimento" value={form.birthDate || ""} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
        <Input placeholder="Diagnóstico / nível de suporte" value={form.diagnosis || ""} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} className="sm:col-span-2" />
        <Textarea placeholder="Observações (sensibilidades, preferências, gatilhos...)" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2" rows={2} />
        <div className="sm:col-span-2 flex justify-end">
          <PrimaryBtn type="submit"><Check className="h-4 w-4" /> {saved ? "Salvo!" : "Salvar"}</PrimaryBtn>
        </div>
      </form>
    </Card>
  );
}

function CaregiversCard({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  const [form, setForm] = useState({ name: "", relationship: "", phone: "", email: "" });

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.relationship) {
      toast.error("Preencha nome e parentesco/vínculo.");
      return;
    }
    const c: Caregiver = { id: uid(), ...form };
    update({ caregivers: [...data.caregivers, c] });
    setForm({ name: "", relationship: "", phone: "", email: "" });
    toast.success("Responsável adicionado!");
  }

  function remove(id: string) {
    update({ caregivers: data.caregivers.filter((c) => c.id !== id) });
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Responsáveis</h3>
      </div>
      <form onSubmit={add} className="grid sm:grid-cols-2 gap-3">
        <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Vínculo (Mãe, Pai, Avó...)" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
        <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="sm:col-span-2 flex justify-end">
          <PrimaryBtn type="submit"><Plus className="h-4 w-4" /> Adicionar</PrimaryBtn>
        </div>
      </form>

      {data.caregivers.length === 0 && <p className="text-sm text-muted-foreground mt-3">Nenhum responsável cadastrado.</p>}
      <div className="space-y-2 mt-3">
        {data.caregivers.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="font-medium text-sm">{c.name} <span className="text-muted-foreground font-normal">— {c.relationship}</span></p>
              {(c.phone || c.email) && (
                <p className="text-xs text-muted-foreground mt-0.5">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
              )}
            </div>
            <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DoctorsCard({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  const [form, setForm] = useState({ name: "", specialty: "", phone: "", location: "", notes: "" });

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.specialty) {
      toast.error("Preencha nome e especialidade.");
      return;
    }
    const d: Doctor = { id: uid(), ...form };
    update({ doctors: [...data.doctors, d] });
    setForm({ name: "", specialty: "", phone: "", location: "", notes: "" });
    toast.success("Médico adicionado!");
  }

  function remove(id: string) {
    update({ doctors: data.doctors.filter((d) => d.id !== id) });
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Stethoscope className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Médicos</h3>
      </div>
      <form onSubmit={add} className="grid sm:grid-cols-2 gap-3">
        <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Especialidade (Neuro, Psiquiatra...)" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
        <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="Local / clínica" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <Textarea placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2" rows={2} />
        <div className="sm:col-span-2 flex justify-end">
          <PrimaryBtn type="submit"><Plus className="h-4 w-4" /> Adicionar</PrimaryBtn>
        </div>
      </form>

      {data.doctors.length === 0 && <p className="text-sm text-muted-foreground mt-3">Nenhum médico cadastrado.</p>}
      <div className="space-y-2 mt-3">
        {data.doctors.map((d) => (
          <div key={d.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="font-medium text-sm">{d.name} <span className="text-muted-foreground font-normal">— {d.specialty}</span></p>
              {(d.phone || d.location) && (
                <p className="text-xs text-muted-foreground mt-0.5">{[d.phone, d.location].filter(Boolean).join(" · ")}</p>
              )}
              {d.notes && <p className="text-xs text-muted-foreground mt-0.5">{d.notes}</p>}
            </div>
            <button onClick={() => remove(d.id)} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TherapistsCard({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  const [form, setForm] = useState({ name: "", specialty: "", phone: "", location: "", notes: "" });

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.specialty) {
      toast.error("Preencha nome e especialidade.");
      return;
    }
    const t: Therapist = { id: uid(), ...form };
    update({ therapists: [...data.therapists, t] });
    setForm({ name: "", specialty: "", phone: "", location: "", notes: "" });
    toast.success("Terapeuta adicionado!");
  }

  function remove(id: string) {
    update({ therapists: data.therapists.filter((t) => t.id !== id) });
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Terapeutas</h3>
      </div>
      <form onSubmit={add} className="grid sm:grid-cols-2 gap-3">
        <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Especialidade (Fono, T.O., ABA...)" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
        <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="Local / clínica" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <Textarea placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2" rows={2} />
        <div className="sm:col-span-2 flex justify-end">
          <PrimaryBtn type="submit"><Plus className="h-4 w-4" /> Adicionar</PrimaryBtn>
        </div>
      </form>

      {data.therapists.length === 0 && <p className="text-sm text-muted-foreground mt-3">Nenhum terapeuta cadastrado.</p>}
      <div className="space-y-2 mt-3">
        {data.therapists.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
            <div>
              <p className="font-medium text-sm">{t.name} <span className="text-muted-foreground font-normal">— {t.specialty}</span></p>
              {(t.phone || t.location) && (
                <p className="text-xs text-muted-foreground mt-0.5">{[t.phone, t.location].filter(Boolean).join(" · ")}</p>
              )}
              {t.notes && <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>}
            </div>
            <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- ROTINA ---------------- */
function RoutineView({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  const done = data.routine.filter((r) => r.done).length;
  const pct = data.routine.length ? Math.round((done / data.routine.length) * 100) : 0;

  function toggle(id: string) {
    update({
      routine: data.routine.map((r) => (r.id === id ? { ...r, done: !r.done } : r)),
    });
  }

  function addStep() {
    const title = prompt("Nome do passo (ex: Tomar água):");
    if (!title) return;
    const icon = prompt("Emoji do passo (ex: 💧):") || "✨";
    const time = prompt("Horário (HH:MM) — opcional:") || "";
    const step: RoutineStep = { id: uid(), title, icon, time, done: false };
    update({ routine: [...data.routine, step] });
  }

  function removeStep(id: string) {
    update({ routine: data.routine.filter((r) => r.id !== id) });
  }

  return (
    <Section
      title="Rotina do dia"
      subtitle="Passo a passo visual para guiar com tranquilidade."
      action={
        <PrimaryBtn onClick={addStep}>
          <Plus className="h-4 w-4" /> Passo
        </PrimaryBtn>
      }
    >
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progresso de hoje</span>
          <span className="text-sm text-muted-foreground">
            {done} de {data.routine.length} ({pct}%)
          </span>
        </div>
        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <ol className="space-y-2">
        {data.routine.map((r, i) => (
          <li key={r.id}>
            <div
              className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                r.done
                  ? "bg-secondary/40 border-secondary"
                  : "bg-card border-border hover:border-primary/40"
              }`}
            >
              <button
                onClick={() => toggle(r.id)}
                className={`h-10 w-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 transition ${
                  r.done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-primary/20"
                }`}
                aria-label={r.done ? "Marcar como não feito" : "Marcar como feito"}
              >
                {r.done ? <Check className="h-5 w-5" /> : i + 1}
              </button>
              <div className="text-2xl">{r.icon}</div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${r.done ? "line-through text-muted-foreground" : ""}`}>
                  {r.title}
                </p>
                {r.time && (
                  <p className="text-xs text-muted-foreground">⏰ {r.time}</p>
                )}
              </div>
              <button
                onClick={() => removeStep(r.id)}
                className="text-muted-foreground hover:text-destructive p-2"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ---------------- AGENDA ---------------- */
const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, string> = {
  Consulta: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  Terapia: "bg-primary/15 text-primary",
  Exame: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Vacina: "bg-green-500/15 text-green-700 dark:text-green-300",
};

function AppointmentTypeBadge({ type }: { type: AppointmentType }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${APPOINTMENT_TYPE_COLORS[type]}`}>
      {type}
    </span>
  );
}

function AgendaView({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  const [form, setForm] = useState<{ type: AppointmentType; title: string; professional: string; datetime: string; location: string; notes: string }>({
    type: "Consulta",
    title: "",
    professional: "",
    datetime: "",
    location: "",
    notes: "",
  });
  const [filterType, setFilterType] = useState<AppointmentType | "Todos">("Todos");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.datetime) {
      toast.error("Preencha título e data/hora.");
      return;
    }
    const apt: Appointment = { id: uid(), ...form };
    update({ appointments: [...data.appointments, apt].sort((a, b) => a.datetime.localeCompare(b.datetime)) });
    setForm({ type: form.type, title: "", professional: "", datetime: "", location: "", notes: "" });
    toast.success("Adicionado à agenda!");
  }

  function remove(id: string) {
    update({ appointments: data.appointments.filter((a) => a.id !== id) });
  }

  const filtered = filterType === "Todos" ? data.appointments : data.appointments.filter((a) => a.type === filterType);
  const upcoming = filtered.filter((a) => new Date(a.datetime) >= new Date());
  const past = filtered.filter((a) => new Date(a.datetime) < new Date());

  return (
    <Section title="Agenda" subtitle="Consultas, terapias, exames e vacinas — com lembrete 30 min antes e na hora.">
      <Card>
        <form onSubmit={add} className="grid sm:grid-cols-2 gap-3">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as AppointmentType })}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          >
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <Input placeholder="Título (ex: Cardiologista, Hemograma...)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Profissional" value={form.professional} onChange={(e) => setForm({ ...form, professional: e.target.value })} />
          <Input type="datetime-local" value={form.datetime} onChange={(e) => setForm({ ...form, datetime: e.target.value })} />
          <Input placeholder="Local" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Textarea placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2" rows={2} />
          <div className="sm:col-span-2 flex justify-end">
            <PrimaryBtn type="submit"><Plus className="h-4 w-4" /> Adicionar</PrimaryBtn>
          </div>
        </form>
      </Card>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType("Todos")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            filterType === "Todos" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          Todos
        </button>
        {APPOINTMENT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filterType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Próximas</h3>
      {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nada agendado.</p>}
      <div className="space-y-2">
        {upcoming.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <AppointmentTypeBadge type={a.type} />
                  <p className="font-semibold">{a.title}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.professional}</p>
                <p className="text-sm mt-1">📅 {new Date(a.datetime).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</p>
                {a.location && <p className="text-sm text-muted-foreground">📍 {a.location}</p>}
                {a.notes && <p className="text-sm mt-1">{a.notes}</p>}
              </div>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive p-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6">Anteriores</h3>
          <div className="space-y-2 opacity-70">
            {past.slice(-5).reverse().map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <AppointmentTypeBadge type={a.type} />
                      <p className="font-semibold">{a.title}</p>
                    </div>
                    <p className="text-sm mt-1">{new Date(a.datetime).toLocaleString("pt-BR")}</p>
                  </div>
                  <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive p-2">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

/* ---------------- MEDICAÇÕES ---------------- */
function MedsView({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  const [form, setForm] = useState({ name: "", dose: "", times: "08:00", notes: "" });
  const todayStr = new Date().toISOString().slice(0, 10);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.dose || !form.times) {
      toast.error("Preencha nome, dose e horários.");
      return;
    }
    const times = form.times.split(",").map((t) => t.trim()).filter(Boolean);
    const med: Medication = { id: uid(), name: form.name, dose: form.dose, times, notes: form.notes, active: true };
    update({ medications: [...data.medications, med] });
    setForm({ name: "", dose: "", times: "08:00", notes: "" });
    toast.success("Medicação adicionada!");
  }

  function toggle(id: string) {
    update({ medications: data.medications.map((m) => (m.id === id ? { ...m, active: !m.active } : m)) });
  }
  function remove(id: string) {
    update({ medications: data.medications.filter((m) => m.id !== id) });
  }

  function isTaken(medId: string, time: string) {
    return data.medicationLogs.some((l) => l.medicationId === medId && l.time === time && l.date === todayStr);
  }

  function confirmDose(medId: string, time: string) {
    if (isTaken(medId, time)) {
      update({
        medicationLogs: data.medicationLogs.filter(
          (l) => !(l.medicationId === medId && l.time === time && l.date === todayStr),
        ),
      });
      return;
    }
    const log: MedicationLog = { id: uid(), medicationId: medId, date: todayStr, time, takenAt: new Date().toISOString() };
    update({ medicationLogs: [log, ...data.medicationLogs] });
    toast.success("Dose confirmada!");
  }

  const recentLogs = [...data.medicationLogs]
    .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
    .slice(0, 20);

  return (
    <Section title="Medicações" subtitle="Cadastre os horários, confirme cada dose e acompanhe o histórico.">
      <Card>
        <form onSubmit={add} className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Nome do remédio" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Dose (ex: 10mg, 1 comp.)" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
          <Input placeholder="Horários separados por vírgula (08:00, 20:00)" value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} className="sm:col-span-2" />
          <Textarea placeholder="Observações (com comida, jejum…)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2" rows={2} />
          <div className="sm:col-span-2 flex justify-end">
            <PrimaryBtn type="submit"><Plus className="h-4 w-4" /> Adicionar</PrimaryBtn>
          </div>
        </form>
      </Card>

      {data.medications.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma medicação cadastrada.</p>}

      <div className="space-y-2">
        {data.medications.map((m) => (
          <Card key={m.id} className={m.active ? "" : "opacity-60"}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-accent/40 flex items-center justify-center text-lg flex-shrink-0">💊</div>
                <div>
                  <p className="font-semibold">{m.name} <span className="text-sm text-muted-foreground font-normal">— {m.dose}</span></p>
                  {m.notes && <p className="text-sm text-muted-foreground mt-1">{m.notes}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggle(m.id)} className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70">
                  {m.active ? "Pausar" : "Ativar"}
                </button>
                <button onClick={() => remove(m.id)} className="text-muted-foreground hover:text-destructive p-2">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {m.active && (
              <div className="flex flex-wrap gap-2 mt-3">
                {m.times.map((t) => {
                  const taken = isTaken(m.id, t);
                  return (
                    <button
                      key={t}
                      onClick={() => confirmDose(m.id, t)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                        taken
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/40"
                      }`}
                    >
                      {taken ? <Check className="h-3.5 w-3.5" /> : "⏰"} {t}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6">Histórico de doses</h3>
      {recentLogs.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma dose confirmada ainda.</p>}
      <div className="space-y-1">
        {recentLogs.map((l) => {
          const med = data.medications.find((m) => m.id === l.medicationId);
          return (
            <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-2.5 text-sm">
              <span>
                💊 <strong>{med?.name || "Medicação removida"}</strong> — {l.time} ({new Date(l.date + "T00:00").toLocaleDateString("pt-BR")})
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {new Date(l.takenAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------------- EVOLUÇÃO ---------------- */
const moodEmoji = ["", "😢", "😕", "😐", "🙂", "😄"];

function EvolutionView({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Omit<EvolutionEntry, "id">>({
    date: today,
    mood: 3,
    sleep: 3,
    eating: 3,
    communication: 3,
    behavior: "",
    achievements: "",
    difficulties: "",
  });

  function add(e: React.FormEvent) {
    e.preventDefault();
    const entry: EvolutionEntry = { id: uid(), ...form };
    update({ evolutions: [entry, ...data.evolutions] });
    setForm({ date: today, mood: 3, sleep: 3, eating: 3, communication: 3, behavior: "", achievements: "", difficulties: "" });
    toast.success("Registro salvo!");
  }

  function remove(id: string) {
    update({ evolutions: data.evolutions.filter((e) => e.id !== id) });
  }

  const chartData = [...data.evolutions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((e) => ({
      date: new Date(e.date + "T00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      Humor: e.mood,
      Sono: e.sleep,
      Alimentação: e.eating,
      Comunicação: e.communication,
    }));

  return (
    <Section title="Evolução" subtitle="Acompanhe humor, sono, alimentação, comunicação e marcos do dia a dia.">
      <Card>
        <form onSubmit={add} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-muted-foreground">Data</span>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
          </div>

          <Scale label="Humor" emojis value={form.mood} onChange={(v) => setForm({ ...form, mood: v as 1 | 2 | 3 | 4 | 5 })} />
          <Scale label="Qualidade do sono" value={form.sleep} onChange={(v) => setForm({ ...form, sleep: v as 1 | 2 | 3 | 4 | 5 })} />
          <Scale label="Alimentação" value={form.eating} onChange={(v) => setForm({ ...form, eating: v as 1 | 2 | 3 | 4 | 5 })} />
          <Scale label="Comunicação" value={form.communication} onChange={(v) => setForm({ ...form, communication: v as 1 | 2 | 3 | 4 | 5 })} />

          <Textarea placeholder="Comportamento / observações do dia" value={form.behavior} onChange={(e) => setForm({ ...form, behavior: e.target.value })} rows={2} />
          <Textarea placeholder="🌟 Conquistas" value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} rows={2} />
          <Textarea placeholder="⚠️ Dificuldades / gatilhos" value={form.difficulties} onChange={(e) => setForm({ ...form, difficulties: e.target.value })} rows={2} />

          <div className="flex justify-end">
            <PrimaryBtn type="submit"><Plus className="h-4 w-4" /> Salvar registro</PrimaryBtn>
          </div>
        </form>
      </Card>

      {chartData.length > 1 && (
        <Card>
          <h3 className="text-sm font-semibold mb-3">Gráfico — últimos {chartData.length} registros</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RLineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis domain={[1, 5]} allowDecimals={false} fontSize={11} />
              <RTooltip />
              <RLegend />
              <Line type="monotone" dataKey="Humor" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Sono" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Alimentação" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Comunicação" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </RLineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Histórico</h3>
      {data.evolutions.length === 0 && <p className="text-sm text-muted-foreground">Sem registros ainda.</p>}
      <div className="space-y-2">
        {data.evolutions.map((e) => (
          <Card key={e.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-semibold">{new Date(e.date + "T00:00").toLocaleDateString("pt-BR")}</p>
                  <span className="text-sm">Humor {moodEmoji[e.mood]}</span>
                  <span className="text-sm">Sono {"⭐".repeat(e.sleep)}</span>
                  <span className="text-sm">Alimentação {"⭐".repeat(e.eating)}</span>
                  <span className="text-sm">Comunicação {"⭐".repeat(e.communication)}</span>
                </div>
                {e.behavior && <p className="text-sm mt-2">{e.behavior}</p>}
                {e.achievements && <p className="text-sm mt-1 text-primary">🌟 {e.achievements}</p>}
                {e.difficulties && <p className="text-sm mt-1 text-destructive">⚠️ {e.difficulties}</p>}
              </div>
              <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-destructive p-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function Scale({ label, value, onChange, emojis = false }: { label: string; value: number; onChange: (v: number) => void; emojis?: boolean }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-12 rounded-xl border text-lg font-medium transition ${
              value === n ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"
            }`}
          >
            {emojis ? moodEmoji[n] : n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- JARDIM DAS CONQUISTAS ---------------- */
const GARDEN_EMOJIS = ["🌱", "🌿", "🍀", "🌸", "🌼", "🌻", "🌷", "🌺"];

function GardenView({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [text, setText] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const c: Conquest = { id: uid(), date: today, text: text.trim() };
    update({ conquests: [c, ...data.conquests] });
    setText("");
    toast.success("Nova flor no jardim! 🌸");
  }

  function remove(id: string) {
    update({ conquests: data.conquests.filter((c) => c.id !== id) });
  }

  const sorted = [...data.conquests].sort((a, b) => a.date.localeCompare(b.date));
  const milestone =
    sorted.length === 0
      ? "Seu jardim está pronto para a primeira semente."
      : sorted.length < 5
        ? "As primeiras sementes foram plantadas! 🌱"
        : sorted.length < 15
          ? "Seu jardim está brotando lindamente! 🌿"
          : sorted.length < 30
            ? "Que jardim florido — continue regando com amor! 🌸"
            : "Um jardim cheio de vitórias — parabéns pela jornada! 🌺";

  return (
    <Section title="Jardim das Conquistas" subtitle="Cada vitória vira uma flor nesse jardim — celebre cada passo.">
      <Card className="bg-gradient-to-br from-accent/20 via-card to-primary/10">
        <form onSubmit={add} className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: falou uma palavra nova, dormiu a noite toda, comeu um alimento novo..."
            rows={2}
          />
          <div className="flex justify-end">
            <PrimaryBtn type="submit"><Plus className="h-4 w-4" /> Plantar conquista</PrimaryBtn>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{milestone}</p>
          <span className="text-xs text-muted-foreground flex-shrink-0">{sorted.length} conquista{sorted.length === 1 ? "" : "s"}</span>
        </div>
        {sorted.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sorted.map((c, i) => (
              <div
                key={c.id}
                title={`${new Date(c.date + "T00:00").toLocaleDateString("pt-BR")} — ${c.text}`}
                className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl hover:scale-110 transition cursor-default"
              >
                {GARDEN_EMOJIS[i % GARDEN_EMOJIS.length]}
              </div>
            ))}
          </div>
        )}
      </Card>

      {data.conquests.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conquista registrada ainda.</p>}
      <div className="space-y-2">
        {data.conquests.map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {new Date(c.date + "T00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                </p>
                <p className="text-sm mt-1">🌼 {c.text}</p>
              </div>
              <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- VERSÍCULO DO DIA ---------------- */
function VerseView() {
  const [offset, setOffset] = useState(0);
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const verse = verseOfTheDay(d);
  const label = offset === 0 ? "Hoje" : d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <Section title="Versículo do dia" subtitle="Uma palavra nova a cada manhã.">
      <Card className="bg-gradient-to-br from-primary/10 via-card to-accent/15">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
          <BookOpen className="h-4 w-4" /> {label}
        </div>
        <blockquote className="mt-4 text-xl sm:text-2xl font-medium leading-relaxed text-foreground">
          “{verse.text}”
        </blockquote>
        <p className="mt-4 text-right text-sm font-semibold text-primary">— {verse.ref}</p>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button onClick={() => setOffset((o) => o - 1)} className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-full hover:bg-muted">
            ← Ontem
          </button>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="text-sm text-primary px-3 py-2 rounded-full hover:bg-primary/10">
              Voltar para hoje
            </button>
          )}
          <button onClick={() => setOffset((o) => o + 1)} className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-full hover:bg-muted">
            Amanhã →
          </button>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-muted-foreground">
          🙏 Reserve um momento de paz. O versículo muda automaticamente todos os dias —
          são {VERSES.length} passagens em rotação.
        </p>
      </Card>
    </Section>
  );
}

/* ---------------- GRATIDÃO ---------------- */
function GratitudeView({ data, update }: { data: Data; update: (p: Partial<Data>) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [text, setText] = useState("");
  const todayEntries = data.gratitudes.filter((g) => g.date === today);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const g: Gratitude = { id: uid(), date: today, text: text.trim() };
    update({ gratitudes: [g, ...data.gratitudes] });
    setText("");
    toast.success("Glória a Deus! 🙏");
  }

  function remove(id: string) {
    update({ gratitudes: data.gratitudes.filter((g) => g.id !== id) });
  }

  // Group history by date (excluding today)
  const history = data.gratitudes.filter((g) => g.date !== today);
  const byDate: Record<string, Gratitude[]> = {};
  for (const g of history) {
    (byDate[g.date] ||= []).push(g);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <Section
      title="Gratidão a Deus"
      subtitle="Por mais um dia vencido — registre o que tornou hoje especial."
    >
      <Card className="bg-gradient-to-br from-accent/20 via-card to-primary/10">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> Hoje sou grato(a) por…
        </div>
        <form onSubmit={add} className="mt-3 space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: pela calma do meu filho hoje, por uma boa conversa com a terapeuta, por mais um dia ao seu lado…"
            rows={3}
          />
          <div className="flex justify-end">
            <PrimaryBtn type="submit"><Plus className="h-4 w-4" /> Registrar gratidão</PrimaryBtn>
          </div>
        </form>
      </Card>

      {todayEntries.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">Hoje</h3>
          <div className="space-y-2">
            {todayEntries.map((g) => (
              <Card key={g.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed">🙏 {g.text}</p>
                  <button onClick={() => remove(g.id)} className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {dates.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6">Diário de gratidão</h3>
          <div className="space-y-3">
            {dates.map((d) => (
              <Card key={d}>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {new Date(d + "T00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                </p>
                <ul className="mt-2 space-y-1">
                  {byDate[d].map((g) => (
                    <li key={g.id} className="text-sm flex items-start justify-between gap-2">
                      <span>🙏 {g.text}</span>
                      <button onClick={() => remove(g.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

/* ---------------- ALARME ---------------- */
function AlarmModal({ event, onClose }: { event: AlarmEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card rounded-3xl border border-border shadow-2xl max-w-md w-full p-8 text-center">
        <div className="mx-auto h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center animate-pulse">
          <AlarmClock className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mt-6 text-2xl font-bold">{event.title}</h2>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">{event.body}</p>
        <button
          onClick={onClose}
          className="mt-8 w-full rounded-full bg-primary text-primary-foreground font-semibold py-4 text-lg hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          <Check className="h-5 w-5" /> Tudo certo, parar alarme
        </button>
        <button
          onClick={onClose}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Dispensar
        </button>
      </div>
    </div>
  );
}
