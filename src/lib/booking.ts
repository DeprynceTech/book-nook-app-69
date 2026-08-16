/**
 * Booking engine — pure, dependency-free slot generation.
 * Used by both the public booking page and the server-side confirmation check.
 */

export type WorkingHour = {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
  staff_id?: string | null;
};

export type BusyInterval = { start: number; end: number };

export type SlotOptions = {
  /** Local calendar date in YYYY-MM-DD */
  date: string;
  workingHours: WorkingHour[];
  durationMinutes: number;
  bufferMinutes?: number;
  busy?: BusyInterval[];
  holidays?: string[];
  /** Slot granularity in minutes */
  stepMinutes?: number;
  /** Earliest bookable moment (epoch ms) */
  now?: number;
  /** Minimum notice before a slot can be booked, in minutes */
  leadMinutes?: number;
};

function parseTime(date: string, time: string) {
  const [h = "0", m = "0"] = time.split(":");
  return new Date(`${date}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`).getTime();
}

export function dayOfWeek(date: string) {
  return new Date(`${date}T12:00:00`).getDay();
}

export function overlaps(a: BusyInterval, b: BusyInterval) {
  return a.start < b.end && b.start < a.end;
}

/** Generate every bookable start time for a service on a given date. */
export function generateSlots(options: SlotOptions): string[] {
  const {
    date,
    workingHours,
    durationMinutes,
    bufferMinutes = 0,
    busy = [],
    holidays = [],
    stepMinutes = 15,
    now = Date.now(),
    leadMinutes = 60,
  } = options;

  if (holidays.includes(date)) return [];

  const dow = dayOfWeek(date);
  const windows = workingHours.filter((wh) => wh.day_of_week === dow && wh.is_open);
  if (windows.length === 0) return [];

  const earliest = now + leadMinutes * 60_000;
  const total = (durationMinutes + bufferMinutes) * 60_000;
  const slots: string[] = [];

  for (const window of windows) {
    const openAt = parseTime(date, window.open_time);
    const closeAt = parseTime(date, window.close_time);
    const breakStart = window.break_start ? parseTime(date, window.break_start) : null;
    const breakEnd = window.break_end ? parseTime(date, window.break_end) : null;

    for (let start = openAt; start + durationMinutes * 60_000 <= closeAt; start += stepMinutes * 60_000) {
      const candidate: BusyInterval = { start, end: start + total };
      if (start < earliest) continue;
      if (breakStart !== null && breakEnd !== null && overlaps(candidate, { start: breakStart, end: breakEnd }))
        continue;
      if (busy.some((interval) => overlaps(candidate, interval))) continue;
      const iso = new Date(start).toISOString();
      if (!slots.includes(iso)) slots.push(iso);
    }
  }

  return slots.sort();
}

/** True when the requested interval collides with an existing appointment. */
export function hasConflict(candidate: BusyInterval, busy: BusyInterval[]) {
  return busy.some((interval) => overlaps(candidate, interval));
}

export function canCancel(startsAt: string, cancellationHours: number, now = Date.now()) {
  return new Date(startsAt).getTime() - now >= cancellationHours * 3_600_000;
}

export function canReschedule(startsAt: string, rescheduleHours: number, now = Date.now()) {
  return new Date(startsAt).getTime() - now >= rescheduleHours * 3_600_000;
}
