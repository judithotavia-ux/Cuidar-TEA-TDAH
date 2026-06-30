import { sb } from "./tea-supabase";

export type AppointmentType = "Consulta" | "Terapia" | "Exame" | "Vacina";

export const APPOINTMENT_TYPES: AppointmentType[] = ["Consulta", "Terapia", "Exame", "Vacina"];

export type Appointment = {
  id: string;
  type: AppointmentType;
  title: string;
  professional: string;
  datetime: string; // ISO
  location?: string;
  notes?: string;
};

export type Medication = {
  id: string;
  name: string;
  dose: string;
  times: string[]; // ["08:00", "20:00"]
  notes?: string;
  active: boolean;
};

export type MedicationLog = {
  id: string;
  medicationId: string;
  date: string; // YYYY-MM-DD
  time: string; // scheduled time, e.g. "08:00"
  takenAt: string; // ISO timestamp of confirmation
};

export type EvolutionEntry = {
  id: string;
  date: string; // ISO date
  mood: 1 | 2 | 3 | 4 | 5;
  sleep: 1 | 2 | 3 | 4 | 5;
  eating: 1 | 2 | 3 | 4 | 5;
  communication: 1 | 2 | 3 | 4 | 5;
  behavior: string;
  achievements?: string;
  difficulties?: string;
};

export type RoutineStep = {
  id: string;
  title: string;
  icon: string;
  time?: string;
  done: boolean;
};

export type Gratitude = {
  id: string;
  date: string; // ISO date
  text: string;
};

export type Conquest = {
  id: string;
  date: string; // ISO date
  text: string;
};

export type Patient = {
  name: string;
  birthDate?: string;
  diagnosis?: string;
  notes?: string;
};

export type Caregiver = {
  id: string;
  name: string;
  relationship: string; // Mãe, Pai, Avó, Cuidador(a)...
  phone?: string;
  email?: string;
};

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  phone?: string;
  location?: string;
  notes?: string;
};

export type Therapist = {
  id: string;
  name: string;
  specialty: string; // Fonoaudiologia, T.O., Psicologia, ABA...
  phone?: string;
  location?: string;
  notes?: string;
};

export type Data = {
  patient: Patient;
  caregivers: Caregiver[];
  doctors: Doctor[];
  therapists: Therapist[];
  appointments: Appointment[];
  medications: Medication[];
  medicationLogs: MedicationLog[];
  evolutions: EvolutionEntry[];
  routine: RoutineStep[];
  gratitudes: Gratitude[];
  conquests: Conquest[];
};

export const defaultData: Data = {
  patient: { name: "" },
  caregivers: [],
  doctors: [],
  therapists: [],
  appointments: [],
  medications: [],
  medicationLogs: [],
  evolutions: [],
  gratitudes: [],
  conquests: [],
  routine: [
    { id: "r1", title: "Acordar com calma", icon: "🌅", time: "07:00", done: false },
    { id: "r2", title: "Escovar os dentes", icon: "🪥", time: "07:30", done: false },
    { id: "r3", title: "Tomar café da manhã", icon: "🥣", time: "08:00", done: false },
    { id: "r4", title: "Vestir a roupa", icon: "👕", time: "08:30", done: false },
    { id: "r5", title: "Atividades / Escola", icon: "🎒", time: "09:00", done: false },
    { id: "r6", title: "Almoçar", icon: "🍽️", time: "12:00", done: false },
    { id: "r7", title: "Momento de descanso", icon: "🛋️", time: "14:00", done: false },
    { id: "r8", title: "Terapia / Brincar", icon: "🧩", time: "15:30", done: false },
    { id: "r9", title: "Jantar", icon: "🍲", time: "19:00", done: false },
    { id: "r10", title: "Banho", icon: "🛁", time: "20:00", done: false },
    { id: "r11", title: "História / Relaxar", icon: "📖", time: "21:00", done: false },
    { id: "r12", title: "Dormir", icon: "🌙", time: "21:30", done: false },
  ],
};

function migrate(parsed: Partial<Data> & { patientName?: string }): Data {
  const merged: Data = { ...defaultData, ...parsed, patient: { ...defaultData.patient, ...parsed.patient } };
  if (!merged.patient.name && parsed.patientName) {
    merged.patient.name = parsed.patientName;
  }
  merged.appointments = merged.appointments.map((a) => ({ ...a, type: a.type || "Consulta" }));
  merged.evolutions = merged.evolutions.map((e) => ({
    ...e,
    eating: e.eating ?? 3,
    communication: e.communication ?? 3,
  }));
  return merged;
}

export async function loadData(userId: string): Promise<Data> {
  const { data: row, error } = await sb.from("tea_data").select("data").eq("user_id", userId).maybeSingle();
  if (error || !row) return defaultData;
  return migrate((row.data as Partial<Data> & { patientName?: string }) || {});
}

export async function saveData(userId: string, data: Data) {
  await sb.from("tea_data").upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
