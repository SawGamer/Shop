// Deal countdown maths. Pure functions, shared by server and client components.

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number; ended: boolean };

export function countdownParts(endsAt: string | number | Date, now: number = Date.now()): CountdownParts {
  const end = new Date(endsAt).getTime();
  const ms = Number.isFinite(end) ? end - now : 0;
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true };
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    ended: false,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2d 03:04:05", or "03:04:05" under a day, or "Deal ended". */
export function formatCountdown(endsAt: string | number | Date, now: number = Date.now()): string {
  const p = countdownParts(endsAt, now);
  if (p.ended) return "Deal ended";
  const clock = `${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`;
  return p.days > 0 ? `${p.days}d ${clock}` : clock;
}

/** Spoken version for screen readers, e.g. "2 days, 3 hours and 4 minutes left". */
export function describeCountdown(endsAt: string | number | Date, now: number = Date.now()): string {
  const p = countdownParts(endsAt, now);
  if (p.ended) return "Deal ended";
  const parts: string[] = [];
  if (p.days) parts.push(`${p.days} ${p.days === 1 ? "day" : "days"}`);
  if (p.hours) parts.push(`${p.hours} ${p.hours === 1 ? "hour" : "hours"}`);
  parts.push(`${p.minutes} ${p.minutes === 1 ? "minute" : "minutes"}`);
  const last = parts.pop()!;
  return `${parts.length ? `${parts.join(", ")} and ${last}` : last} left`;
}

export type DealStatus = "scheduled" | "running" | "ended";

export function dealStatus(deal: { startsAt: string; endsAt: string }, now: number = Date.now()): DealStatus {
  if (new Date(deal.endsAt).getTime() <= now) return "ended";
  if (new Date(deal.startsAt).getTime() > now) return "scheduled";
  return "running";
}
