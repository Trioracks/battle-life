import {homeDateLabel} from './home-calendar.js?rev=28';
const KEY = 'battle-life-apartment-v3-time';
const durations = { sink: 15, stove: 30, fridge: 5 };
const smooth = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const positiveFinite = (value) => Number.isFinite(value) && value > 0;
const normalizedMinutes = (value) => Number.isFinite(value) ? ((value % 1440) + 1440) % 1440 : 0;

function validSnapshot(value) {
  return isRecord(value) && Number.isSafeInteger(value.day) && value.day > 0
    && Number.isFinite(value.minutes) && value.minutes >= 0 && value.minutes < 1440;
}

function validSleep(value) {
  return isRecord(value) && positiveFinite(value.minutes) && positiveFinite(value.seconds)
    && Number.isFinite(value.elapsedSeconds) && value.elapsedSeconds >= 0 && value.elapsedSeconds < value.seconds;
}

function timeLabel(minutes) {
  // Fractional frame sums can fall just below an exact minute; 1e-9 minutes is only 60 nanoseconds.
  const whole = Math.floor(normalizedMinutes(minutes) + 1e-9) % 1440;
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

export function homeLight(minutes) {
  const hour = normalizedMinutes(minutes) / 60;
  // A stylized home schedule: dawn at 04:00, full light at 07:00, dusk from 17:00 to 21:00.
  const daylight = hour < 12 ? smooth((hour - 4) / 3) : 1 - smooth((hour - 17) / 4);
  const warmth = Math.max(0, 1 - Math.abs(hour - 6.5) / 1.5, 1 - Math.abs(hour - 18.5) / 2);
  return { daylight, warmth, period: hour < 4 || hour >= 22 ? 'Ночь' : hour < 11 ? 'Утро' : hour < 17 ? 'День' : 'Вечер' };
}

export function clockHandAngles(minutes) {
  const normalized = normalizedMinutes(minutes);
  return { hour: (normalized % 720) / 720 * Math.PI * 2, minute: (normalized % 60) / 60 * Math.PI * 2 };
}

export class ApartmentTime {
  #sleep = null;

  constructor(snapshot = { day: 1, minutes: 1410 }) {
    const saved = validSnapshot(snapshot) ? snapshot : { day: 1, minutes: 1410 };
    this.day = saved.day;
    this.minutes = saved.minutes;
    this.mealReady = saved.mealReady === true;
    this.lights = Object.fromEntries(['living','kitchen'].map(room=>[room,typeof saved.lights?.[room]==='boolean'?saved.lights[room]:true]));
    this.initialRest = typeof saved.initialRest === 'boolean' ? saved.initialRest : saved.day === 1 && saved.minutes >= 1410;
    if (validSleep(saved.sleep)) {
      this.#setSleep(saved.sleep.minutes, saved.sleep.seconds, saved.sleep.elapsedSeconds);
    }
  }

  #setSleep(minutes, seconds, elapsedSeconds = 0) {
    const target = this.minutes + minutes * (1 - elapsedSeconds / seconds);
    this.#sleep = { minutes, seconds, elapsedSeconds, targetDay: this.day + Math.floor(target / 1440), targetMinutes: target % 1440 };
    this.initialRest = false;
  }

  beginSleep(options = {}) {
    if (this.isSleeping || !isRecord(options)) return false;
    const { minutes = 360, seconds = 8 } = options;
    if (!positiveFinite(minutes) || !positiveFinite(seconds)) return false;
    this.#setSleep(minutes, seconds);
    return true;
  }

  cancelSleep() {
    const wasSleeping = this.isSleeping;
    this.#sleep = null;
    this.initialRest = false;
    return wasSleeping;
  }

  advanceMinutes(value) {
    if (!positiveFinite(value)) return;
    const total = this.minutes + value;
    this.day += Math.floor(total / 1440);
    this.minutes = total % 1440;
  }

  tick(dt) {
    if (!positiveFinite(dt)) return { sleepCompleted: false };
    if (!this.isSleeping) {
      this.advanceMinutes(dt / 4);
      return { sleepCompleted: false };
    }
    const sleep = this.#sleep;
    sleep.elapsedSeconds = Math.min(sleep.seconds, sleep.elapsedSeconds + dt);
    // Avoid requiring an extra frame because repeated fractional deltas sum a few ulps short.
    const completed = sleep.seconds - sleep.elapsedSeconds <= Number.EPSILON * Math.max(1, sleep.seconds) * 64;
    if (completed) sleep.elapsedSeconds = sleep.seconds;
    const remainingMinutes = sleep.minutes * (1 - sleep.elapsedSeconds / sleep.seconds);
    const timeBeforeTarget = sleep.targetMinutes - remainingMinutes;
    this.day = sleep.targetDay + Math.floor(timeBeforeTarget / 1440);
    this.minutes = normalizedMinutes(timeBeforeTarget);
    return { sleepCompleted: completed };
  }

  completeAction(id) {
    if (id === 'stove') this.mealReady = true;
    if (id === 'dining') {
      if (this.mealReady) { this.mealReady = false; this.advanceMinutes(15); }
      return;
    }
    if (id === 'bed') this.cancelSleep();
    else this.advanceMinutes(durations[id] ?? 0);
  }

  toggleRoomLight(room) {
    if (room !== 'living' && room !== 'kitchen') return null;
    this.lights[room] = !this.lights[room];
    return this.lights[room];
  }

  snapshot() {
    const snapshot = { day: this.day, minutes: this.minutes, initialRest: this.initialRest };
    if (this.mealReady) snapshot.mealReady = true;
    if (!this.lights.living || !this.lights.kitchen) snapshot.lights = {...this.lights};
    if (this.isSleeping) {
      const { minutes, seconds, elapsedSeconds } = this.#sleep;
      snapshot.sleep = { minutes, seconds, elapsedSeconds };
    }
    return snapshot;
  }

  get isSleeping() { return this.#sleep !== null && this.#sleep.elapsedSeconds < this.#sleep.seconds; }
  get sleepProgress() { return this.#sleep ? this.#sleep.elapsedSeconds / this.#sleep.seconds : 0; }
  get sleepTargetLabel() { return this.#sleep ? timeLabel(this.#sleep.targetMinutes) : null; }
  get light() { return homeLight(this.minutes); }
  get period() { return this.light.period; }
  get label() { return timeLabel(this.minutes); }
  get dateLabel() { return homeDateLabel(this.day); }
}

export function saveHomeTime(storage, clock) {
  try {
    if (!storage) return false;
    storage.setItem(KEY, JSON.stringify(clock.snapshot()));
    return true;
  } catch { return false; }
}

export function loadHomeTime(storage) {
  try {
    const value = JSON.parse(storage?.getItem(KEY) ?? 'null');
    return validSnapshot(value) ? new ApartmentTime(value) : null;
  } catch { return null; }
}
