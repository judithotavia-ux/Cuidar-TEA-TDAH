let ctx: AudioContext | null = null;
let intervalId: number | null = null;
let vibrateId: number | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function primeAudio() {
  // Must be called from a user gesture so audio can play later.
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0.0001;
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.01);
}

function beep() {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  [0, 0.25, 0.5].forEach((t) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, now + t);
    g.gain.setValueAtTime(0.0001, now + t);
    g.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.18);
    o.connect(g).connect(c.destination);
    o.start(now + t);
    o.stop(now + t + 0.2);
  });
}

export function startAlarm() {
  stopAlarm();
  beep();
  intervalId = window.setInterval(beep, 1500);
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.([500, 200, 500, 200, 500]); } catch { /* ignore */ }
    vibrateId = window.setInterval(() => {
      try { navigator.vibrate?.([500, 200, 500]); } catch { /* ignore */ }
    }, 2000);
  }
}

export function stopAlarm() {
  if (intervalId !== null) { window.clearInterval(intervalId); intervalId = null; }
  if (vibrateId !== null) { window.clearInterval(vibrateId); vibrateId = null; }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate?.(0); } catch { /* ignore */ }
  }
}