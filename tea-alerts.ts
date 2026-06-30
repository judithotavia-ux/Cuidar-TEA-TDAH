import type { Appointment, Medication } from "./tea-storage";

export type AlarmEvent = {
  id: string;
  kind: "appointment" | "medication";
  title: string;
  body: string;
};

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    /* ignore */
  }
}

const SENT_KEY = "tea-alerts-sent-v1";
function getSent(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
  } catch {
    return {};
  }
}
function setSent(s: Record<string, number>) {
  localStorage.setItem(SENT_KEY, JSON.stringify(s));
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function checkAlerts(
  appointments: Appointment[],
  medications: Medication[],
  onToast: (msg: string) => void,
  onAlarm?: (ev: AlarmEvent) => void,
): void {
  const now = new Date();
  const sent = getSent();

  // Appointments: alert 30 min before and at time
  for (const a of appointments) {
    const t = new Date(a.datetime).getTime();
    const diff = t - now.getTime();
    const key30 = `apt-30-${a.id}`;
    const key0 = `apt-0-${a.id}`;
    if (diff <= 30 * 60 * 1000 && diff > 25 * 60 * 1000 && !sent[key30]) {
      const msg = `Consulta em 30 min: ${a.title} com ${a.professional}`;
      notify("Lembrete de consulta", msg);
      onToast(msg);
      sent[key30] = Date.now();
    }
    if (diff <= 5 * 60 * 1000 && diff > -5 * 60 * 1000 && !sent[key0]) {
      const msg = `Agora: ${a.title} com ${a.professional}`;
      notify("Consulta agora", msg);
      onAlarm?.({ id: `apt-${a.id}`, kind: "appointment", title: "Consulta agora!", body: msg });
      sent[key0] = Date.now();
    }
  }

  // Medications: alert at scheduled time (within 1 min window), once per day per time
  for (const m of medications) {
    if (!m.active) continue;
    for (const t of m.times) {
      const [hh, mm] = t.split(":").map(Number);
      if (isNaN(hh) || isNaN(mm)) continue;
      const target = new Date(now);
      target.setHours(hh, mm, 0, 0);
      const diff = Math.abs(target.getTime() - now.getTime());
      const key = `med-${m.id}-${t}-${dayKey(now)}`;
      if (diff <= 60 * 1000 && !sent[key]) {
        const msg = `Hora do remédio: ${m.name} (${m.dose})`;
        notify("Lembrete de medicação", msg);
        onAlarm?.({ id: key, kind: "medication", title: "Hora do remédio!", body: msg });
        sent[key] = Date.now();
      }
    }
  }

  // Cleanup old entries (>2 days)
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  for (const k of Object.keys(sent)) {
    if (sent[k] < cutoff) delete sent[k];
  }
  setSent(sent);
}
