// Times cross the network as instants: a moment that is the same everywhere, written in UTC,
// like "2026-11-10T08:00:00.000Z". The clinic's opening hours are times on the clinic's wall.

// Sweden is an hour ahead of UTC.
const offset = "+01:00";

// The instant of a wall time in the clinic, like 2026-11-10 at 09:00.
export function toInstant(date: string, time: string): string {
  return new Date(date + "T" + time + offset).toISOString();
}

// The clinic's wall time at an instant.
export function fromInstant(instant: string): { date: string; time: string } {
  const wall = new Date(new Date(instant).getTime() + 60 * 60 * 1000).toISOString();
  return { date: wall.slice(0, 10), time: wall.slice(11, 16) };
}
